## Context

`layanan_service.mekanik_id` (nullable FK → `mekanik.id`) dan `riwayat_penugasan_mekanik` sudah dibuat di `0001_init_schema.sql` tapi tidak pernah ditulis. Dua pola arsitektur sudah mapan dan perlu dipilih salah satu untuk fitur ini:

1. **Pola RPC** (`daftar_servis`/`ubah_servis`/`hapus_servis`, migrasi 0002): dipakai untuk operasi **multi-tabel** (`layanan_service` + `pelanggan` sekaligus), `SECURITY INVOKER`, validasi di PL/pgSQL, error dikembalikan sebagai kode lalu dipetakan `servisErrors.ts`.
2. **Pola update langsung + trigger** (`ubahStatus` di `src/lib/servis.ts`, trigger `trg_aturan_layanan` & `trg_log_status`): dipakai untuk perubahan **satu kolom** pada `layanan_service` yang aturannya murni bergantung pada state kolom lain di baris yang sama, dengan log otomatis oleh trigger `AFTER UPDATE`.

Penugasan mekanik adalah perubahan satu kolom (`mekanik_id`) yang aturannya bergantung pada `layanan_service.status` (baris yang sama) dan `mekanik.is_active`/`status_hadir` (baris lain, dibaca read-only) — tidak ada tabel lain yang ditulis oleh app code. Ini cocok dengan pola 2.

## Goals / Non-Goals

**Goals:**
- Service Advisor bisa menugaskan & reassign mekanik dari `ServisDetailPage`, dibatasi ke mekanik `is_active = true` dan `status_hadir = true`.
- Setiap penugasan/reassign tercatat otomatis ke `riwayat_penugasan_mekanik` (FR-5.9), konsisten dengan `riwayat_status` yang "diisi oleh trigger DB, bukan oleh kode frontend" (keputusan terkunci Iterasi 0).
- Penugasan terkunci begitu `status` mencapai `Selesai Dikerjakan` atau `Sudah Diambil` (FR-5.10).
- Menonaktifkan mekanik yang masih punya beban kerja aktif ditolak di database (bukan hanya dicegah di UI).
- Dashboard & Manajemen Mekanik menampilkan data penugasan yang benar (nama mekanik, daftar kendaraan per mekanik).

**Non-Goals:**
- Tidak mengimplementasikan penugasan many-to-many (tetap satu mekanik per kendaraan — guardrail proyek).
- Tidak mengubah state machine status servis maupun trigger `trg_aturan_layanan` yang sudah ada.
- Tidak menambah RPC baru.
- Tidak menyentuh modul WhatsApp, autentikasi, atau monitoring publik.

## Decisions

### D1. Update langsung dari client, bukan RPC baru
`tugaskanMekanik(layananId, mekanikId)` di `src/lib/servis.ts` memanggil `supabase.from('layanan_service').update({ mekanik_id }).eq('id', layananId)`, persis seperti `ubahStatus`. Validasi bisnis (eligibilitas mekanik, kunci status) ditegakkan trigger `BEFORE UPDATE`, bukan di PL/pgSQL RPC. Alasan: menghindari RPC keempat untuk kasus yang sebenarnya adalah "conditional single-column update", pola yang sudah ada preseden-nya (`ubahStatus`) dan lebih sederhana untuk dipahami sesi berikutnya.

Alternatif yang dipertimbangkan: RPC `tugaskan_mekanik(p_layanan_id, p_mekanik_id)` mengikuti pola `daftar_servis`. Ditolak karena tidak ada tulisan ke tabel lain yang butuh transaksi eksplisit dari sisi app — trigger DB sudah cukup atomik untuk update + log.

### D2. Trigger `BEFORE UPDATE OF mekanik_id ON layanan_service`
Menolak (raise exception dengan kode yang dipetakan `servisErrors.ts`) bila:
- `new.mekanik_id` tidak null dan mekanik tersebut bukan `is_active = true` **dan** `status_hadir = true` → kode `MEKANIK_TIDAK_TERSEDIA`.
- `old.status` adalah `'Selesai Dikerjakan'` → kode `PENUGASAN_TERKUNCI` (khusus mekanik; `'Sudah Diambil'` sudah otomatis diblokir oleh `trg_aturan_layanan` yang menolak **semua** update saat status itu dengan `SERVIS_TERKUNCI`, jadi tidak perlu diulang, tapi tetap ditambahkan secara eksplisit di trigger baru ini untuk kejelasan dan agar tidak bergantung pada urutan trigger).

Catatan urutan trigger: PostgreSQL menjalankan trigger `BEFORE` pada nama alfabetis. Trigger baru diberi nama `trg_aturan_penugasan_mekanik` agar berjalan setelah `trg_aturan_layanan` (alfabetis: aturan_layanan < aturan_penugasan) — urutan ini tidak kritis di sini karena keduanya independen (memeriksa kolom berbeda), tapi konsisten secara penamaan dengan trigger status yang sudah ada.

### D3. Trigger `AFTER UPDATE OF mekanik_id ON layanan_service` → tulis `riwayat_penugasan_mekanik`
Hanya menulis baris log ketika `new.mekanik_id is not null and new.mekanik_id is distinct from old.mekanik_id` (assign atau reassign). Tidak menulis log bila mekanik di-set kembali ke `null` (bukan aksi yang didefinisikan FR manapun — lihat Open Questions). Kolom `ditugaskan_oleh = auth.uid()`, `waktu = now()`, mengikuti pola persis `log_status_change`.

### D4. Trigger `BEFORE UPDATE OF is_active ON mekanik` (saat `new.is_active = false`)
Menolak dengan kode `MEKANIK_MASIH_BERTUGAS` bila `exists (select 1 from layanan_service where mekanik_id = old.id and status <> 'Sudah Diambil')`. Service Advisor harus reassign kendaraan tersebut ke mekanik lain dulu sebelum bisa menonaktifkan. Alasan (dari keputusan pengguna): mencegah data tidak konsisten (mekanik nonaktif tapi masih "menangani" kendaraan aktif di UI) daripada membiarkan lalu membersihkan belakangan.

### D5. Eligibilitas dropdown: aktif **dan** hadir
Sesuai flowchart PRD Bagian 10.4 (bukan hanya teks FR-5.6). Ditegakkan dua lapis (defense-in-depth, pola yang sama dengan `trg_aturan_layanan` untuk transisi status):
- **UI**: `ambilMekanikTersedia()` (baru, di `src/lib/mekanik.ts`) query `mekanik` dengan `is_active = true AND status_hadir = true` untuk mengisi dropdown.
- **DB**: trigger D2 menolak pilihan yang tidak memenuhi syarat, walau UI seharusnya sudah memfilternya (menutup celah race condition, mis. mekanik ditandai tidak hadir tepat sebelum SA menekan simpan).

Mekanik yang sudah ditugaskan sebelumnya lalu berubah jadi tidak hadir **tidak** otomatis di-unassign — servis tetap menunjuk ke mekanik itu sampai SA reassign manual (trigger hanya memvalidasi *mekanik baru* saat kolom berubah, bukan re-validasi baris yang tidak berubah).

### D6. Error mapping
`servisErrors.ts` mendapat dua kode baru: `MEKANIK_TIDAK_TERSEDIA` ("Mekanik ini sedang tidak aktif atau tidak hadir.") dan `PENUGASAN_TERKUNCI` ("Servis ini sudah selesai dikerjakan, penugasan tidak dapat diubah."). `mekanikErrors.ts` mendapat kode baru `MEKANIK_MASIH_BERTUGAS` ("Mekanik ini masih menangani kendaraan aktif. Pindahkan penugasannya dulu.").

### D7. UI — `ServisDetailPage.tsx`
Baris baru "Mekanik" di antara data servis: menampilkan nama mekanik saat ini atau "Belum ditugaskan". Saat `aktif && servis.status !== 'Selesai Dikerjakan'`: dropdown mekanik tersedia + tombol Simpan. Bila sudah ada mekanik sebelumnya dan SA memilih mekanik lain → `ConfirmDialog` "Ganti penugasan?" (mengikuti pola reassign di flowchart 10.4, gaya sama dengan konfirmasi pada `StatusActionButton`). Bila belum ada mekanik → simpan langsung tanpa konfirmasi (bukan "reassign", cukup "assign" pertama kali).

### D8. UI — `DashboardPage.tsx` & `src/lib/servis.ts`
`ambilServisAktif()` diubah select menjadi `'*, mekanik(nama)'`; kolom Mekanik di dashboard menampilkan `s.mekanik?.nama ?? '-'`. Tipe `Servis` diperluas menjadi `Servis & { mekanik: { nama: string } | null }` khusus untuk hasil query ini (tidak mengubah `Tables<'layanan_service'>`).

### D9b. Wajib tugaskan mekanik sebelum maju ke `Diperiksa`
Permintaan tambahan dari pengguna (di luar FR-5.6–5.10 tertulis, tapi konsisten dengan tujuan iterasi): status servis MUST NOT berpindah dari `Menunggu Antrian` ke `Diperiksa` selama `layanan_service.mekanik_id` masih `null`, berlaku di halaman Daftar Servis maupun Detail Servis.

- **DB**: trigger baru `BEFORE UPDATE OF status ON layanan_service` (migrasi terpisah `0004_wajib_mekanik_sebelum_diperiksa.sql`, bukan menambah ke `0003` yang migrasinya sudah dijalankan pengguna — migrasi yang sudah dieksekusi tidak diubah lagi, mengikuti pola `0001`/`0002`). Menolak dengan kode `MEKANIK_BELUM_DITUGASKAN` bila `old.status = 'Menunggu Antrian' and new.status = 'Diperiksa' and new.mekanik_id is null`. Ini trigger ketiga yang menyentuh `layanan_service` (bersama `trg_aturan_layanan` dari status dan `trg_aturan_penugasan_mekanik` dari mekanik_id) — tidak saling tumpang tindih karena masing-masing dibatasi `OF <kolom>` atau memeriksa kolom yang berbeda.
- **UI**: `StatusActionButton` (dipakai bersama oleh `ServisListPage` dan `ServisDetailPage`) diperluas menerima `mekanik_id` pada prop `servis`, lalu menonaktifkan tombol "→ Diperiksa" (bukan menyembunyikannya) saat `mekanik_id` masih `null`, dengan `title` yang menjelaskan alasan. SA tetap bisa membuka detail servis (link nomor polisi selalu tampil) untuk menugaskan mekanik dulu. Trigger DB tetap jadi penjaga akhir (defense-in-depth) bila tombol tetap ter-klik lewat jalur lain.
- Alasan menonaktifkan (bukan menyembunyikan): SA tetap perlu tahu langkah berikutnya ada, dan mengapa belum bisa — konsisten dengan gaya `disabled:opacity-60` yang sudah dipakai di seluruh aplikasi untuk tombol yang sedang tidak bisa ditekan.

### D9. UI — `MekanikPage.tsx` (FR-5.8)
Tiap baris mekanik mendapat kontrol disclosure "Lihat kendaraan yang ditangani (N)" yang, saat dibuka, memanggil `ambilKendaraanMekanik(mekanikId)` (baru, di `src/lib/mekanik.ts`) — query `layanan_service` dengan `mekanik_id = id` dan `status <> 'Sudah Diambil'`, menampilkan nomor polisi + status. Dimuat on-demand (bukan sekaligus di `ambilDaftarMekanik`) supaya daftar mekanik tetap ringan.

## Risks / Trade-offs

- **[Risk]** Dua trigger `BEFORE UPDATE` terpisah (`trg_aturan_layanan` untuk status, `trg_aturan_penugasan_mekanik` untuk mekanik_id) berarti perubahan status+mekanik dalam satu `UPDATE` statement akan memicu keduanya — perlu dipastikan tidak saling menimpa kolom yang sama. → **Mitigasi**: trigger baru hanya menyentuh `mekanik_id` (via klausa `OF mekanik_id`, hanya terpicu bila kolom itu berubah), trigger lama hanya menyentuh `status`/`tanggal_selesai`; tidak ada overlap kolom yang ditulis. Ditambah, UI tidak pernah mengubah status dan mekanik_id dalam satu request yang sama (dua tombol terpisah).
- **[Risk]** `WHEN` clause trigger PostgreSQL untuk `AFTER UPDATE OF mekanik_id` hanya terpicu bila kolom itu benar-benar disebut di statement `UPDATE`, bukan berdasarkan nilai berubah — perlu tambahan `WHEN (old.mekanik_id IS DISTINCT FROM new.mekanik_id)` agar update lain yang menyebut kolom tapi tidak mengubah nilainya tidak membuat log kosong. → **Mitigasi**: eksplisit tambahkan `WHEN` clause, mengikuti pola persis `trg_log_status`.
- **[Trade-off]** Tidak ada aksi "batalkan penugasan" (set `mekanik_id` kembali ke `null`) di UI iterasi ini — hanya assign & reassign ke mekanik lain. Bila SA salah pilih, satu-satunya jalan adalah reassign ke mekanik yang benar. Dianggap cukup karena tidak ada FR yang secara eksplisit meminta "un-assign"; bisa ditambah di iterasi berikutnya bila dibutuhkan.

## Migration Plan

1. Tulis `supabase/migrations/0003_penugasan_mekanik.sql` berisi 3 fungsi trigger + trigger baru di atas. Idempoten (`create or replace function`, `drop trigger if exists` sebelum `create trigger`), mengikuti gaya file migrasi sebelumnya.
2. **Pengguna** menjalankan migrasi secara manual di Supabase SQL Editor (agent tidak menjalankan migrasi maupun uji manual — lihat catatan kerja proyek).
3. Frontend build & lint (`npm run build`, `npm run lint`) dijalankan agent sebagai gerbang otomatis sebelum iterasi dianggap selesai.
4. Tidak ada rollback data (tidak ada perubahan kolom); rollback cukup `drop trigger` bila diperlukan.

## Open Questions

- Apakah dibutuhkan aksi eksplisit "batalkan penugasan" (set mekanik ke null) di iterasi mendatang? Ditunda — lihat Trade-off D di atas.
