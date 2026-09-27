## Why

`layanan_service.mekanik_id` dan tabel `riwayat_penugasan_mekanik` sudah ada sejak Iterasi 0, tapi belum ada jalur untuk mengisinya: Service Advisor tidak bisa menugaskan mekanik ke kendaraan, dashboard menampilkan `mekanik_id` mentah (UUID) alih-alih nama, dan "beban kerja" di halaman Manajemen Mekanik selalu 0. Iterasi 4b menutup gap ini sesuai roadmap PRD Bagian 13 (FR-5.6–5.10).

## What Changes

- Service Advisor dapat menugaskan satu mekanik (aktif & hadir) ke sebuah `layanan_service` yang sudah terdaftar, dan mengganti (reassign) penugasan tersebut selama servis belum `Selesai Dikerjakan`/`Sudah Diambil`.
- Setiap aksi tugaskan/reassign otomatis tercatat ke `riwayat_penugasan_mekanik` oleh trigger database (bukan kode frontend), mengikuti pola `riwayat_status` yang sudah ada.
- Penugasan mekanik terkunci (read-only) begitu servis mencapai `Selesai Dikerjakan` atau `Sudah Diambil`.
- Menonaktifkan mekanik yang masih menangani servis aktif ditolak oleh database dengan pesan yang jelas, sampai penugasannya dipindahkan ke mekanik lain.
- Halaman Manajemen Mekanik menampilkan daftar kendaraan (nomor polisi) yang sedang ditangani tiap mekanik.
- Dashboard ("Aktifitas Hari Ini") menampilkan nama mekanik yang ditugaskan, bukan lagi UUID mentah.
- **Status servis tidak dapat maju dari `Menunggu Antrian` ke `Diperiksa` sebelum mekanik ditugaskan** — berlaku di halaman Daftar Servis maupun Detail Servis, ditegakkan di database.
- Tidak ada RPC baru — mengikuti pola `ubahStatus` (update langsung dari client + aturan bisnis ditegakkan trigger DB).

## Capabilities

### New Capabilities
_(tidak ada — perluasan dari capability yang sudah ada)_

### Modified Capabilities
- `mekanik-management`: menambahkan requirement penugasan mekanik ke kendaraan (FR-5.6–5.10) — tugaskan, reassign, lihat penugasan per mekanik, kunci penugasan pada servis yang sudah selesai/diambil, serta larangan menonaktifkan mekanik yang masih punya beban kerja aktif.
- `database-schema`: menambahkan requirement trigger baru untuk validasi penugasan mekanik (eligibilitas aktif+hadir, kunci status), pencatatan otomatis `riwayat_penugasan_mekanik`, dan larangan maju ke `Diperiksa` tanpa mekanik.
- `sa-dashboard`: mengubah requirement kolom Mekanik pada tabel Aktifitas Hari Ini agar menampilkan nama mekanik yang ditugaskan, bukan `mekanik_id`.
- `service-management`: mengubah requirement "Ubah status satu ketuk" — tombol "→ Diperiksa" dinonaktifkan selama servis belum punya mekanik yang ditugaskan.

## Impact

- **Database**: migrasi `supabase/migrations/0003_penugasan_mekanik.sql` — 3 trigger baru di `layanan_service` (validasi + log penugasan) dan `mekanik` (cegah nonaktifkan saat masih ada beban kerja); migrasi baru `0004_wajib_mekanik_sebelum_diperiksa.sql` — trigger yang menolak transisi `Menunggu Antrian` → `Diperiksa` selama `mekanik_id` masih `null`. Tidak ada perubahan kolom/tabel.
- **Frontend**: `src/lib/servis.ts` (fungsi `tugaskanMekanik`, query join `mekanik(nama)`), `src/lib/servisErrors.ts` (kode error baru, termasuk `MEKANIK_BELUM_DITUGASKAN`), `src/lib/mekanik.ts` (daftar mekanik aktif+hadir untuk dropdown, daftar kendaraan per mekanik), `src/lib/mekanikErrors.ts` (kode error nonaktifkan gagal), `src/components/StatusActionButton.tsx` (nonaktifkan tombol "→ Diperiksa" tanpa mekanik, dipakai bersama oleh halaman Daftar dan Detail Servis), `src/pages/ServisDetailPage.tsx` (UI penugasan/reassign), `src/pages/DashboardPage.tsx` (perbaikan kolom Mekanik), `src/pages/MekanikPage.tsx` (lihat kendaraan per mekanik).
- Tidak ada perubahan pada modul lain (autentikasi, kelola akun, monitoring publik, WhatsApp) — di luar scope perubahan ini.
