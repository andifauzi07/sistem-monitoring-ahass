## Why

Iterasi 3 (Dashboard & Riwayat) sudah selesai, tapi Service Advisor belum punya cara mengelola data mekanik (tabel `mekanik` sudah ada sejak Iterasi 0 tapi belum tersentuh frontend) maupun mengubah data akunnya sendiri. Ini adalah Iterasi 4 pada roadmap `docs/PRD.md` Bagian 13, langkah wajib sebelum Iterasi 4b (penugasan mekanik ke kendaraan) bisa dibangun — penugasan butuh daftar mekanik aktif yang bisa dipilih.

## What Changes

- Halaman baru **Manajemen Mekanik**: tambah mekanik (FR-5.1), edit nama (FR-5.2), ubah status hadir/tidak hadir (FR-5.3), nonaktifkan via soft delete `is_active` (FR-5.4), daftar mekanik aktif dengan status hadir + kartu beban kerja (FR-5.5).
- Halaman baru **Kelola Akun**: Service Advisor melihat/mengubah nama, email, dan password akunnya sendiri (FR-6.1).
- CRUD mekanik memakai query Supabase langsung (`.insert`/`.update`/`.select` ke tabel `mekanik`) — tidak perlu RPC baru, karena operasinya single-table dan RLS `authenticated akses penuh` sudah ada sejak Iterasi 0.
- Update akun memakai `supabase.auth.updateUser` untuk email/password (auto-confirm, tanpa alur verifikasi ulang email) dan update langsung ke `service_advisors.nama` untuk nama.
- Kartu "beban kerja" per mekanik akan menampilkan 0 untuk semua mekanik pada iterasi ini (kolom `layanan_service.mekanik_id` baru terisi setelah Iterasi 4b) — bukan bug, disepakati di sesi eksplorasi.
- Navigasi (`Layout.tsx`/`router.tsx`) mendapat tautan ke halaman Manajemen Mekanik dan Kelola Akun.

Di luar scope iterasi ini (masuk Iterasi 4b, jangan dikerjakan sekarang): penugasan mekanik ke `layanan_service` (FR-5.6–5.10), tabel `riwayat_penugasan_mekanik`, dan perbaikan kolom "Mekanik" di Dashboard (`DashboardPage.tsx`) yang saat ini menampilkan `mekanik_id` mentah — itu baru bisa diperbaiki setelah data penugasan ada.

## Capabilities

### New Capabilities
- `mekanik-management`: CRUD data mekanik (tambah, edit nama, ubah status hadir, nonaktifkan) dan daftar mekanik aktif beserta beban kerja saat ini.
- `sa-account`: Service Advisor melihat dan mengubah nama, email, dan password akunnya sendiri.

### Modified Capabilities
(tidak ada — tidak mengubah requirement pada spec yang sudah ada)

## Impact

- Kode baru: `src/lib/mekanik.ts`, `src/pages/MekanikPage.tsx`, `src/lib/akun.ts` (atau serupa), `src/pages/AkunPage.tsx`.
- Kode diubah: `src/router.tsx` (route baru), `src/components/Layout.tsx` (tautan navigasi baru).
- Tidak ada migrasi DB baru (skema `mekanik` & RLS sudah ada dari Iterasi 0).
- Tidak mengubah `DashboardPage.tsx` — perbaikan kolom "Mekanik" ditunda ke Iterasi 4b.
