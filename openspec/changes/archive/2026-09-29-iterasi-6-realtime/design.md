## Context

- **Akses data.** Role `authenticated` punya akses penuh ke semua tabel lewat policy "service advisor akses penuh". Role `anon` tidak punya akses tabel sama sekali dan hanya boleh memanggil RPC `cek_status(nopol)` (`SECURITY DEFINER`, kolom tersanitasi). Konsekuensinya, halaman publik tidak bisa memakai `postgres_changes`. Hal ini sudah dicatat sebagai risiko sejak Iterasi 0.
- **Pola pemuatan data.** Semua halaman memuat data lewat `useMuat(loader)` (`src/lib/useMuat.ts`). Fungsi `muatUlang()` di dalamnya mengambil ulang data tanpa mengosongkan data lama, sehingga tampilan tidak berkedip.
- **Listener tab aktif.** `DashboardPage`, `ServisListPage`, dan `ServisDetailPage` masing-masing punya listener `visibilitychange` identik yang memanggil `muatUlang()`. Halaman publik belum punya listener ini.
- **Halaman publik.** Nomor polisi yang dicari diambil dari URL (`/?nopol=`), sudah dinormalisasi, dan identik dengan `layanan_service.nomor_polisi` di DB karena keduanya melewati `normalize_nopol`.
- **Konfigurasi Supabase.** Akses channel publik di Realtime Settings sudah diizinkan (dikonfirmasi pengguna).
- **Keputusan pengguna saat eksplorasi.**
  - Halaman publik memakai Broadcast ditambah jaring pengaman (opsi C).
  - Realtime SA hanya di Dashboard, Daftar Servis, dan Detail Servis.
  - Edit Servis tanpa realtime.

## Goals / Non-Goals

**Goals:**
- Perubahan status oleh SA langsung terlihat di halaman pelanggan yang sedang membuka nopol tersebut, tanpa reload (FR-7.3, DoD Iterasi 6).
- Dashboard, Daftar Servis, dan Detail Servis di tablet SA lain ikut diperbarui otomatis (FR-3.4).
- Tidak ada data pelanggan tambahan yang terekspos ke `anon`. `cek_status` tetap satu-satunya jalur baca publik.
- Satu hook bersama untuk semua halaman, sehingga logika tab aktif dan sambung ulang tidak diduplikasi.

**Non-Goals:**
- Realtime di Riwayat, Manajemen Mekanik, Edit Servis, dan dropdown mekanik di Detail Servis.
- Menerapkan payload event langsung ke state (patch atau optimistic update). Semua tetap lewat refetch.
- Channel privat dengan RLS pada `realtime.messages`.
- Notifikasi WhatsApp (Iterasi 7).

## Decisions

### D1. Event hanya sinyal, data selalu diambil ulang lewat loader yang sudah ada

Event realtime, baik broadcast maupun `postgres_changes`, tidak dibaca isinya. Setiap event hanya memicu `muatUlang()`.

Alasannya:
- Sanitasi publik tetap terpusat di `cek_status`.
- Halaman SA tidak perlu logika penggabungan state. Contohnya, dashboard butuh join nama mekanik, sedangkan payload `postgres_changes` hanya berisi baris mentah.
- Payload palsu yang dikirim klien lain ke channel publik tidak bisa memalsukan tampilan (lihat Risks).

*Alternatif:* menerapkan payload ke state lokal. Ditolak karena rumit, rawan tidak konsisten, dan untuk channel publik justru berisiko karena siapa pun bisa mengirim broadcast ke channel publik.

### D2. Publik memakai Broadcast dari trigger DB ke channel publik `servis:<NOPOL>`

Migrasi `0005_realtime.sql` membuat fungsi trigger `siarkan_perubahan_servis()` dengan sifat berikut:
- berjalan `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` pada `layanan_service`;
- memanggil `realtime.send('{}'::jsonb, 'berubah', 'servis:' || nomor_polisi, false)`. Argumen terakhir `private = false` menandakan channel publik, sehingga `anon` bisa subscribe tanpa policy di `realtime.messages`.

Aturan pengiriman:

| Operasi | Kapan dikirim | Ke topik |
|---|---|---|
| INSERT | selalu | `NEW.nomor_polisi` |
| DELETE | selalu | `OLD.nomor_polisi` |
| UPDATE | hanya bila salah satu kolom yang terlihat publik berubah (`status`, `nomor_polisi`, `jenis_motor`, `tanggal_masuk`, `tanggal_selesai`), dibandingkan dengan `IS DISTINCT FROM` | `NEW.nomor_polisi`; bila nopol berubah, juga `OLD.nomor_polisi` |

Perubahan yang hanya menyentuh `mekanik_id`, `masalah`, dan kolom sejenis tidak menghasilkan sinyal, karena tidak mengubah hasil `cek_status`.

Detail implementasi fungsi:
- `SECURITY DEFINER` dengan `set search_path = ''`, supaya pemanggilan `realtime.send` tidak bergantung pada hak role pemicu (`authenticated` lewat update langsung maupun lewat RPC `SECURITY INVOKER`);
- hak `EXECUTE` dicabut dari `public`, `anon`, dan `authenticated`, konsisten dengan fungsi trigger lain;
- isi fungsi dibungkus `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING` agar kegagalan broadcast tidak pernah menggagalkan transaksi SA. Realtime bersifat best-effort, sedangkan data tetap benar.

*Alternatif:*
- Polling berkala. Ditolak pengguna karena FR-7.3 menyebut Supabase Realtime secara eksplisit.
- `realtime.broadcast_changes` dengan channel privat. Ditolak karena butuh sesi auth, sedangkan pelanggan tidak login.
- Policy SELECT `anon`. Ditolak karena RLS tidak bisa memeriksa apakah pengguna mengetahui nopol, sehingga seluruh tabel bisa bocor.

### D3. SA memakai `postgres_changes` lewat publication `supabase_realtime`

Migrasi menambahkan `public.layanan_service` dan `public.mekanik` ke publication `supabase_realtime`. Penambahan dibungkus blok `DO` yang memeriksa `pg_publication_tables` dulu, sehingga migrasi bisa dijalankan ulang. RLS yang ada sudah membatasi event hanya untuk `authenticated`. `anon` tidak menerima event apa pun karena tidak punya hak SELECT.

Langganan per halaman:

| Halaman | Langganan |
|---|---|
| **Dashboard** | `event: '*'` pada `layanan_service` dan `mekanik` (kartu mekanik hadir) |
| **Daftar Servis** | `event: '*'` pada `layanan_service` |
| **Detail Servis** | `UPDATE` dengan filter `id=eq.<id>`, ditambah `DELETE` tanpa filter lalu dicocokkan dengan `payload.old.id` di klien. Supabase tidak mendukung filter pada event DELETE. Bila servis dihapus di tablet lain, refetch menghasilkan "tidak ditemukan", sama seperti saat membuka id yang sudah tidak ada. |

`riwayat_status` tidak perlu dipublikasikan. Setiap perubahan status sudah menghasilkan UPDATE pada `layanan_service`, dan refetch Detail ikut memuat linimasa terbaru.

### D4. Hook bersama `useSinyalRealtime`

Hook ditempatkan di `src/lib/useSinyalRealtime.ts`. Tanggung jawabnya:

```
useSinyalRealtime({ nama, pasang, aktif = true }, muatUlang) → { terhubung: boolean }

 subscribe(channel) ──event──▶ debounce 300 ms ─▶ muatUlang()
     │
     ├─ status SUBSCRIBED setelah sebelumnya putus
     │   (CHANNEL_ERROR / TIMED_OUT / CLOSED)            ─▶ muatUlang()
     └─ document visibilitychange → visible              ─▶ muatUlang()
 cleanup: clearTimeout + supabase.removeChannel(channel)
```

Rincian perilaku:
- **Parameter `pasang`.** Berupa callback yang menerima `RealtimeChannel` dan mendaftarkan listener (`.on('broadcast', …)` atau `.on('postgres_changes', …)`). Hook memanggil `.subscribe()` sendiri. Nilai `nama` dan `pasang` harus stabil (`useCallback`), mengikuti konvensi `loader` pada `useMuat`. Channel dibuat ulang saat keduanya berubah, misalnya saat nopol di URL atau id servis berganti.
- **Tanpa refetch pada `SUBSCRIBED` pertama.** Pemuatan awal sudah ditangani `useMuat`. Refetch hanya dilakukan saat tersambung kembali, untuk menutup event yang mungkin terlewat selama koneksi putus. Klien Realtime supabase-js otomatis mencoba bergabung ulang.
- **Parameter `aktif = false`.** Tidak ada channel yang dibuat. Dipakai halaman publik saat belum ada nopol valid. Listener `visibilitychange` juga hanya dipasang saat `aktif`.
- **Debounce 300 ms.** Menggabungkan event beruntun menjadi satu refetch. Contohnya: gema aksi sendiri setelah `useStatusFeedback` memanggil `muatUlang()`, "Batalkan" dalam 5 detik, dan `ubah_servis` yang menyentuh dua tabel.
- **Nilai `terhubung`.** Bernilai `true` selama status channel `SUBSCRIBED`. Dipakai indikator koneksi di halaman publik. Halaman SA boleh mengabaikannya.
- **Nama channel harus unik per halaman** (mis. `sa-dashboard`, `sa-servis-list`, `sa-servis-<id>`). Dengan begitu `removeChannel` saat berpindah halaman tidak memutus channel halaman lain. Channel publik memakai nama topik persis `servis:<NOPOL>` dengan `config: { private: false }`.
- **Listener `visibilitychange` lokal dihapus** dari tiga halaman SA, digantikan hook ini.

*Alternatif:* TanStack Query dengan invalidasi. Ditolak karena menambah dependency, sedangkan `useMuat` + `muatUlang` sudah memenuhi kebutuhan.

### D5. Halaman Edit Servis tidak berlangganan

Refetch otomatis di halaman Edit Servis bisa menimpa isian form yang sedang diketik. Keamanan data tetap dijaga di lapisan DB: trigger transisi dan kunci `Sudah Diambil` menolak edit yang tidak valid, dan pesan errornya sudah dipetakan.

### D6. UX pembaruan di halaman publik

Elemen yang ditampilkan saat ada nopol valid dan hasil sudah dimuat:
- **Indikator kecil di dekat hasil.** Titik hijau dengan teks "Live · diperbarui otomatis" saat `terhubung`. Saat tidak terhubung, titik abu-abu dengan teks "Menghubungkan ulang…". Indikator ini tidak memblokir tampilan data.
- **Teks "Diperbarui pukul HH:MM".** Berasal dari waktu hasil terakhir berhasil dimuat, diformat dengan helper WITA yang sudah ada.
- **Region `aria-live="polite"`.** Mengumumkan "Status berubah menjadi <status>" hanya ketika status servis aktif berbeda dari hasil sebelumnya. Kartu servis diberi highlight singkat (transisi warna Tailwind, tanpa library animasi).
- **Tampilan selama refetch akibat sinyal.** Data lama tetap tampil (perilaku `useMuat`) dan tidak ada skeleton. Tombol "Cek Status" tidak ikut berstatus loading. Status "memuat" untuk tombol hanya dipakai saat submit.

Untuk refetch karena sinyal, perlu dibedakan antara "belum ada data untuk nopol ini" (loading awal) dan "sedang menyegarkan". Pembedaan ini sudah tersedia karena `useMuat` mempertahankan data selama `loader` sama. Bila sifat ini ternyata tidak cukup, bisa ditambahkan state kecil di halaman tanpa mengubah kontrak `useMuat`.

## Risks / Trade-offs

- **[Siapa pun bisa subscribe atau mengirim broadcast ke `servis:<NOPOL>` karena channel publik]**
  - Mitigasi: payload diabaikan (D1). Pengirim palsu paling jauh hanya memicu refetch `cek_status`, yang dibatasi debounce 300 ms dan tetap mengembalikan data asli.
  - Subscriber asing hanya menerima sinyal kosong. Untuk melihat data, ia tetap harus mengetahui nopol dan memanggil `cek_status`, yang memang sudah bisa ia lakukan sekarang. Tidak ada permukaan kebocoran baru.
- **[Broadcast gagal atau Realtime sedang gangguan]**
  - Mitigasi: fungsi trigger menelan exception sehingga transaksi SA tetap sukses.
  - Di sisi klien, refetch tetap terjadi saat tersambung ulang dan saat tab aktif. Tombol "Cek Status" / "Muat ulang" juga tetap tersedia.
- **[HP mengunci layar atau browser menidurkan WebSocket tab latar]**
  - Mitigasi: refetch saat `visibilitychange` menjadi `visible` dan saat status `SUBSCRIBED` kembali.
- **[Setting "public access" Realtime dimatikan di masa depan]**
  - Dampak: halaman publik diam-diam kembali ke pola refetch saat tab aktif.
  - Mitigasi: indikator menampilkan "Menghubungkan ulang…" sehingga masalahnya terlihat. Hal ini dicatat di `supabase/README.md`.
- **[Event gema dari aksi sendiri menyebabkan refetch ganda]**
  - Mitigasi: debounce. Refetch tambahan tidak berbahaya karena `muatUlang` tidak mengosongkan data.
- **[Kuota Realtime Supabase free tier]**
  - Jumlah koneksi bengkel satu cabang jauh di bawah batas. Tidak ada mitigasi khusus.
- **[Dropdown mekanik di Detail bisa basi bila status hadir diubah di tablet lain]**
  - Mitigasi: di luar scope. Trigger DB tetap menolak penugasan ke mekanik yang tidak hadir, dan pesan errornya sudah dipetakan.

## Migration Plan

1. Jalankan `supabase/migrations/0005_realtime.sql` di Supabase SQL Editor. Migrasi idempoten, jadi aman dijalankan ulang.
2. Pastikan Realtime Settings mengizinkan akses channel publik (sudah dikonfirmasi).
3. Deploy frontend.

**Rollback:**
- `drop trigger` / `drop function siarkan_perubahan_servis`;
- `alter publication supabase_realtime drop table public.layanan_service, public.mekanik`.

Frontend tetap berfungsi tanpa realtime karena masih ada fallback tab aktif dan tombol manual.

## Open Questions

- Tidak ada yang memblokir. Perlu diverifikasi saat implementasi: apakah callback `subscribe` di versi `@supabase/supabase-js` yang terpasang dipanggil ulang dengan `SUBSCRIBED` setelah rejoin otomatis. Bila tidak, hook memakai status `CHANNEL_ERROR`/`TIMED_OUT` untuk menandai perlunya refetch pada `SUBSCRIBED` berikutnya.
