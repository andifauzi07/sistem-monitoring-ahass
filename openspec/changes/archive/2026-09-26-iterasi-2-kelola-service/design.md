## Context

Kondisi setelah Iterasi 0–1:

- **Skema** (`0001_init_schema.sql`):
  - enum `status_servis` berisi 5 nilai berurutan;
  - `pelanggan` berisi satu baris per kendaraan (`nomor_polisi` unik);
  - `layanan_service` menyimpan snapshot `nama_pembawa`/`nomor_wa` per kunjungan;
  - partial unique index `layanan_service_satu_aktif_per_pelanggan` (`where status <> 'Sudah Diambil'`);
  - trigger normalisasi nopol, `updated_at`, dan log `riwayat_status` (AFTER, memakai `auth.uid()`);
  - RLS memberi `authenticated` akses penuh dan `anon` tanpa akses.
- **Frontend:**
  - `AuthProvider`/`useAuth`;
  - guard `RequireAuth` sebagai layout route (rute SA baru cukup ditambahkan sebagai child);
  - Supabase client bertipe `Database` (ditulis manual di `src/types/database.ts`);
  - helper `normalizeNopol`/`formatNopol`.
- **Belum ada** state management, data fetching library, maupun komponen UI bersama.

Fakta lapangan dari eksplorasi dengan pengguna:

- Mekanik melaporkan progres secara lisan, lalu SA yang mengklik setiap perubahan status.
- SA memakai **tablet**.
- Pengguna mengonfirmasi keputusan berikut:
  - `tanggal_selesai` diisi saat status menjadi `Selesai Dikerjakan`;
  - FR-3.2 berarti CRUD layanan secara umum;
  - hapus hanya saat `Menunggu Antrian`;
  - edit juga memperbarui kontak di `pelanggan`.

## Goals / Non-Goals

**Goals:**

- FR-3.1–FR-3.5 berjalan end-to-end dengan aturan bisnis yang **ditegakkan di database**, bukan hanya di UI. Alasannya, RLS memberi `authenticated` akses penuh dan publishable key bersifat publik.
- Operasi multi-tabel (pelanggan + layanan) bersifat atomik.
- Alur ubah status cepat di tablet: satu ketuk dari daftar, bisa dibatalkan, dan langkah berdampak besar memerlukan konfirmasi.
- Aman terhadap dua tablet SA yang mengubah servis yang sama.

**Non-Goals:**

- Realtime (Iterasi 6). Daftar di-refresh setelah aksi, saat tab kembali fokus, dan lewat tombol muat ulang.
- Penugasan mekanik (Iterasi 4b). Kolom `mekanik_id` tidak disentuh dan tidak ditampilkan.
- Dashboard agregat dan halaman riwayat servis selesai (Iterasi 3).
- WhatsApp, format nomor internasional (`62…`) untuk provider, dan status "Dibatalkan".
- Master data jenis motor. `jenis_motor` tetap teks bebas sesuai ERD.

## Decisions

### D1. Aturan status ditegakkan oleh trigger `BEFORE` di database

Fungsi `public.aturan_layanan_service()` dipasang sebagai `BEFORE INSERT OR UPDATE` pada `layanan_service`. Tanggung jawabnya:

| Kejadian | Aturan |
|---|---|
| INSERT | `status` MUST `Menunggu Antrian` dan `tanggal_selesai := null` |
| UPDATE apa pun saat `old.status = 'Sudah Diambil'` | tolak dengan `SERVIS_TERKUNCI` |
| `status` berubah | selisih posisi (`array_position(enum_range(null::status_servis), …)`) MUST tepat ±1; jika tidak, tolak dengan `TRANSISI_STATUS_TIDAK_VALID` |
| `Dikerjakan` → `Selesai Dikerjakan` | `tanggal_selesai := now()` |
| `Selesai Dikerjakan` → `Dikerjakan` | `tanggal_selesai := null` |
| selain itu | `tanggal_selesai := old.tanggal_selesai`, sehingga kolom ini sepenuhnya dikelola DB dan tidak bisa diisi manual |

Trigger `BEFORE DELETE` terpisah (`public.cegah_hapus_layanan()`) menolak penghapusan dengan `HAPUS_TIDAK_DIIZINKAN` bila `old.status <> 'Menunggu Antrian'`.

*Alternatif:* validasi hanya di UI, atau RPC khusus `ubah_status`. Validasi UI saja ditolak karena mudah dilewati lewat REST langsung. RPC ubah status tidak diperlukan: `UPDATE` biasa sudah dijaga trigger, dan log `riwayat_status` yang ada tetap bekerja tanpa perubahan.

Trigger BEFORE berjalan berurutan menurut abjad nama. `trg_aturan_layanan` berjalan sebelum `trg_normalize_nopol` dan `trg_set_updated_at`, dan ketiganya tidak saling bergantung.

### D2. Kode error sebagai `message`, dipetakan di frontend

Semua penolakan memakai `raise exception '<KODE>' using errcode = 'P0001', detail = …`. PostgREST meneruskannya sebagai `{ code: 'P0001', message: 'KODE', details }`. `src/lib/servisErrors.ts` memetakan kode ke pesan Bahasa Indonesia:

| Kode | Pesan UI (ringkas) |
|---|---|
| `SERVIS_AKTIF_ADA` (`details` = id servis aktif) | "Kendaraan ini masih punya servis aktif", dengan tautan ke servis tersebut |
| `TRANSISI_STATUS_TIDAK_VALID` | "Perubahan status tidak valid" |
| `SERVIS_TERKUNCI` | "Servis sudah diambil dan tidak dapat diubah" |
| `HAPUS_TIDAK_DIIZINKAN` | "Hanya servis berstatus Menunggu Antrian yang dapat dihapus" |
| `DATA_TIDAK_VALID` (`details` = nama field) | pesan per field |
| `SERVIS_TIDAK_DITEMUKAN` | "Servis tidak ditemukan" |
| `23505` pada `layanan_service_satu_aktif_per_pelanggan` | sama dengan `SERVIS_AKTIF_ADA` (untuk race condition) |
| jaringan / lainnya | pola yang sama dengan `authErrors.ts` |

Status yang sudah berubah di tablet lain (lihat D5) terdeteksi di client, bukan lewat kode dari DB.

*Alternatif:* custom SQLSTATE (mis. `PT409`). Ditolak karena PostgREST memakai kelas `PT` untuk status HTTP, dan menambah coupling tanpa manfaat berarti.

### D3. RPC `daftar_servis`, `ubah_servis`, `hapus_servis` (SECURITY INVOKER)

Ketiga RPC:

- memakai `language plpgsql`, `security invoker`, dan `set search_path = ''`;
- `grant execute` hanya ke `authenticated` (`revoke` dari `public` dan `anon`);
- memakai `SECURITY INVOKER` sehingga RLS dan `auth.uid()` (untuk `riwayat_status.diubah_oleh` dan `service_advisor_id`) tetap berlaku seperti query biasa;
- memakai parameter berawalan `p_` agar tidak bentrok dengan nama kolom.

**`daftar_servis(p_nomor_polisi, p_nama_pembawa, p_nomor_wa, p_jenis_motor, p_kilometer, p_masalah) → uuid`**

1. Validasi dan normalisasi (D4). Jika gagal, lempar `DATA_TIDAK_VALID`.
2. Jika kendaraan (nopol ternormalisasi) sudah punya servis aktif, lempar `SERVIS_AKTIF_ADA` dengan id servis aktif sebagai detail. Pengecekan ini dilakukan sebelum upsert agar kontak `pelanggan` tidak berubah pada percobaan yang gagal. Karena satu transaksi, rollback juga menjamin hal ini.
3. `insert into pelanggan … on conflict (nomor_polisi) do update set nama_pembawa = excluded.nama_pembawa, nomor_wa = excluded.nomor_wa returning id`.
4. `insert into layanan_service (…, service_advisor_id = auth.uid(), pelanggan_id)`. Jika terjadi `unique_violation`, lempar `SERVIS_AKTIF_ADA`.
5. Kembalikan id layanan baru.

**`ubah_servis(p_id, p_nomor_polisi, p_nama_pembawa, p_nomor_wa, p_jenis_motor, p_kilometer, p_masalah) → void`**

1. `select … for update` baris layanan. Jika tidak ada, lempar `SERVIS_TIDAK_DITEMUKAN`. Jika `Sudah Diambil`, lempar `SERVIS_TERKUNCI`. Validasi seperti D4.
2. Jika nopol **sama**, `update pelanggan set nama_pembawa, nomor_wa where id = pelanggan_id`.
3. Jika nopol **berbeda**, upsert `pelanggan` untuk nopol baru dan ambil `pelanggan_id` baru.
4. `update layanan_service` untuk semua field data dan `pelanggan_id`. `status` tidak diubah di sini. Jika terjadi `unique_violation`, lempar `SERVIS_AKTIF_ADA`, karena nopol tujuan sedang punya servis aktif lain.
5. Jika `pelanggan_id` berubah dan baris pelanggan lama tidak lagi dirujuk layanan mana pun, hapus baris itu. Biasanya ini baris hasil salah ketik.

Memperbarui kontak `pelanggan` aman karena edit hanya mungkin selama servis aktif. Satu kendaraan maksimal punya satu servis aktif, jadi yang diedit selalu kunjungan terbaru.

**`hapus_servis(p_id) → void`**

1. Hapus layanan. Trigger D1 menolak bila status bukan `Menunggu Antrian`. Jika tidak ada baris yang terhapus, lempar `SERVIS_TIDAK_DITEMUKAN`.
2. Hapus `pelanggan` terkait bila sudah tidak punya layanan lain.

*Alternatif:* dua atau tiga query dari client. Ditolak karena tidak atomik (bisa meninggalkan `pelanggan` tanpa layanan atau `pelanggan_id` yang tidak sinkron dengan nopol) dan bentrok index sulit diterjemahkan.

### D4. Validasi input di dua lapis

Aturan yang sama diterapkan di RPC (sumber kebenaran) dan di form (umpan balik cepat). Di database, validasi ada dalam satu fungsi bersama `bersihkan_input_servis` yang dipanggil `daftar_servis` dan `ubah_servis` (fungsi ini `SECURITY INVOKER`, sehingga `authenticated` perlu hak eksekusi; isinya murni, tanpa akses tabel). Padanan di frontend: `src/lib/servisValidation.ts`.

- `nomor_polisi`: setelah `normalize_nopol`, panjangnya 3–10 karakter.
- `nama_pembawa`, `jenis_motor`, `masalah`: di-`trim`, wajib terisi, `masalah` ≤ 1000 karakter.
- `nomor_wa`: spasi, tanda hubung, dan titik dibuang, lalu harus cocok `^\+?[0-9]{9,15}$`. Nilai yang tersimpan adalah hasil pembersihan tersebut. Konversi ke format provider (`62…`) ditunda ke iterasi WhatsApp.
- `kilometer`: bilangan bulat ≥ 0 (tabel juga punya `check`).

### D5. Ubah status: `UPDATE` bersyarat dari client (optimistic concurrency)

```ts
supabase.from('layanan_service')
  .update({ status: tujuan })
  .eq('id', id).eq('status', statusSaatIni)   // guard: status belum diubah orang lain
  .select('id, status, tanggal_selesai')
```

Jika hasilnya 0 baris, berarti status sudah diubah di tablet lain. UI menampilkan "Status sudah berubah, data dimuat ulang" lalu melakukan refetch. Ini mencegah ketukan ganda atau dua tablet yang sama-sama memajukan status dua langkah. "Batalkan" memakai fungsi yang sama dengan arah sebaliknya (`statusSaatIni = tujuan`, `tujuan = sebelumnya`), sehingga ikut terlindungi. Trigger D1 tetap menjadi jaring pengaman terakhir.

Aturan UX (helper di `src/lib/statusServis.ts`):

| Aksi | Konfirmasi | Toast "Batalkan" (±5 dtk) |
|---|---|---|
| → `Diperiksa`, → `Dikerjakan` | tidak | ya |
| → `Selesai Dikerjakan` | ya | ya |
| → `Sudah Diambil` | ya, dengan penegasan bahwa aksi ini final | **tidak** (status final) |
| Mundur satu langkah (halaman detail) | ya | tidak |

Tombol di daftar selalu berlabel status tujuan ("→ Dikerjakan"). Tombol mundur hanya ada di halaman detail agar tidak ikut terketuk di daftar yang padat.

### D6. Rute dan struktur frontend

```
RequireAuth
 ├─ /dashboard          (tetap, placeholder + tautan ke /servis)
 ├─ /servis             ServisListPage     — servis aktif (status ≠ Sudah Diambil)
 ├─ /servis/baru        ServisBaruPage     — ServisForm mode tambah
 ├─ /servis/:id         ServisDetailPage   — data, aksi status, hapus, linimasa riwayat
 └─ /servis/:id/edit    ServisEditPage     — ServisForm mode edit
```

- **Data:** `src/lib/servis.ts` berisi fungsi async bertipe:
  - `ambilServisAktif`, `ambilServis(id)` (dengan embed `riwayat_status(status_baru, waktu, service_advisors(nama))`);
  - `cariKendaraan(nopol)`, `daftarServis`, `ubahServis`, `ubahStatus`, `hapusServis`.

  Komponen memakai `useState`/`useEffect` biasa melalui hook kecil per halaman.

  *Alternatif:* TanStack Query. Ditunda karena menambah dependency, padahal kebutuhan cache dan invalidasi masih sederhana. Bisa dipertimbangkan saat realtime masuk di Iterasi 6.
- **Isi otomatis:** saat nopol di-blur (atau debounce ±400 ms setelah ≥ 3 karakter), `cariKendaraan` mengambil `pelanggan` beserta `jenis_motor` dari layanan terakhirnya dan servis aktif bila ada.
  - Form hanya mengisi field yang **masih kosong**, tidak menimpa ketikan SA.
  - Jika ada servis aktif, tampil peringatan dengan tautan ke servis tersebut sebelum SA menekan simpan.
  - Hanya berlaku di mode tambah.
- **Urutan daftar:** `tanggal_masuk` naik (antrian terlama di atas), dengan filter chip per status dan pencarian nopol di sisi client. Jumlah servis aktif per hari kecil, jadi tidak perlu paginasi.
- **Kesegaran data tanpa realtime:** refetch setelah setiap aksi, saat `visibilitychange` menjadi terlihat, dan lewat tombol "Muat ulang".
- **Komponen bersama:** `ServisForm`, `StatusBadge`, `ConfirmDialog` (elemen `<dialog>` native dengan `showModal()` untuk fokus dan Esc tanpa dependency), `UndoToast` beserta hook `useUndoToast`.
- **Format:** `src/lib/format.ts` memakai `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar' })` (Mamuju = WITA) dan pemisah ribuan untuk kilometer.

### D7. Tata letak tablet-first

- Target sentuh minimal 44 px (`min-h-11`) dan jarak antar tombol aksi yang cukup.
- Tidak ada informasi yang hanya muncul lewat hover.
- Daftar tampil sebagai kartu (satu kolom di portrait, dua kolom di `md`) dan berubah menjadi baris ringkas satu baris per servis mulai `lg` (landscape ±1024 px). Kedua tampilan memakai satu markup responsif (bukan `<table>` terpisah), sehingga tombol aksi dan dialog tidak terduplikasi di DOM. Tombol aksi status selalu terlihat di setiap baris.
- Atribut input form:
  - nopol memakai `autoCapitalize="characters"` dan dipratinjau dengan `formatNopol`;
  - WA memakai `inputMode="tel"`;
  - kilometer memakai `inputMode="numeric"`;
  - `masalah` memakai `textarea`.
- Header menambah tautan "Servis" di antara "Dashboard" dan "Keluar".

## Risks / Trade-offs

- **[Risiko] SA mengubah `pelanggan` atau `layanan_service` langsung lewat REST dan melewati RPC**, sehingga `pelanggan_id` tidak sinkron dengan nopol. → Semua pengguna `authenticated` adalah SA tepercaya, dan aturan kritis (transisi, kunci, hapus, `tanggal_selesai`) tetap dijaga trigger. Pengetatan RLS ditunda sampai ada kebutuhan multi-peran.
- **[Trade-off] Waktu di `riwayat_status` adalah waktu klik, bukan waktu kejadian di pit.** SA sering memperbarui status beberapa motor sekaligus. → Didokumentasikan. Jangan dipakai sebagai durasi pengerjaan yang presisi.
- **[Trade-off] "Batalkan" menghasilkan dua baris riwayat tambahan** (maju lalu mundur). → Diterima demi jejak audit yang jujur. Linimasa detail menampilkan apa adanya.
- **[Risiko] Pelanggan melihat status mundur**, atau servis hilang bila dihapus setelah sempat mundur ke `Menunggu Antrian`. → Hapus dibatasi pada status awal. Kasus mundur-lalu-hapus jarang terjadi dan diterima untuk MVP.
- **[Risiko] Iterasi WhatsApp nanti bisa mengirim notifikasi "selesai" yang lalu dibatalkan.** → Dicatat untuk iterasi WhatsApp, misalnya dengan jeda pengiriman melebihi durasi toast.
- **[Risiko] Daftar basi di tablet kedua tanpa realtime.** → Refetch saat fokus dan guard status di D5 mencegah aksi berdasarkan data lama. Solusi penuh ada di Iterasi 6.
- **[Risiko] Frontend di-deploy sebelum migrasi 0002 dijalankan**, sehingga RPC tidak ditemukan. → README dan tasks mewajibkan migrasi dijalankan lebih dulu. Error "function not found" dipetakan ke pesan konfigurasi.

## Migration Plan

1. Pengguna menjalankan `supabase/migrations/0002_kelola_service.sql` di SQL Editor. File ini idempoten: memakai `create or replace function` dan `drop trigger if exists` sebelum `create trigger`.
2. Pengguna menjalankan query verifikasi di README (transisi ilegal ditolak, hapus ditolak, RPC ada).
3. Setelah itu frontend dijalankan atau di-deploy.

**Rollback:** jalankan `drop trigger` untuk `trg_aturan_layanan` dan `trg_cegah_hapus_layanan`, lalu `drop function` untuk kelima fungsi baru. Tidak ada perubahan kolom atau data, jadi skema kembali persis seperti 0001.

## Open Questions

- Tidak ada yang memblokir implementasi.
- Untuk iterasi mendatang:
  - format nomor WA untuk provider;
  - jeda notifikasi terkait "Batalkan";
  - apakah halaman detail `Sudah Diambil` perlu ditautkan dari halaman Riwayat (Iterasi 3).
