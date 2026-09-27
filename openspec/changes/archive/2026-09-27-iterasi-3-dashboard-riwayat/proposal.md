## Why

Iterasi 2 menuntaskan CRUD servis, tapi halaman `/dashboard` masih placeholder ("Dashboard operasional dikerjakan pada Iterasi 3") dan belum ada cara bagi Service Advisor untuk melihat servis yang sudah selesai (`Sudah Diambil`) selain membuka satu per satu. Iterasi 3 mengisi dua kebutuhan operasional harian ini: ringkasan kondisi pit saat ini (dashboard) dan pencarian servis lampau (riwayat).

## What Changes

- Dashboard (`/dashboard`) menampilkan data agregat nyata dari `layanan_service` dan `mekanik`, menggantikan placeholder:
  - Kartu **Total Unit Entry di Pit**: jumlah servis dengan status ≠ `Sudah Diambil` (semua servis aktif, tanpa filter tanggal masuk).
  - Kartu **Mekanik yang Hadir**: jumlah mekanik `status_hadir = true` dari total mekanik aktif. Akan selalu tampil `0/0` pada iterasi ini karena tabel `mekanik` masih kosong (CRUD mekanik baru ada di Iterasi 4) — perilaku yang disengaja, bukan bug.
  - Tabel **Aktifitas Hari Ini**: daftar semua servis aktif dengan kolom Mekanik, Tipe Motor, Keterangan, Status. Kolom Mekanik selalu menampilkan "-" pada iterasi ini karena `mekanik_id` belum pernah diisi (mekanisme penugasan baru ada di Iterasi 4b).
- Halaman baru **Riwayat Servis** (`/riwayat`) menampilkan servis berstatus `Sudah Diambil` saja, dengan filter rentang tanggal (`tanggal_selesai`) dan pencarian nomor polisi.
- Navigasi (`Layout.tsx`) menambahkan tautan ke halaman Riwayat untuk SA yang sudah login.

## Capabilities

### New Capabilities

- `sa-dashboard`: Ringkasan agregat kondisi pit (unit aktif, mekanik hadir, aktifitas hari ini) untuk Service Advisor.
- `service-history`: Pencarian dan penelusuran servis yang sudah selesai (`Sudah Diambil`) dengan filter tanggal dan nomor polisi.

### Modified Capabilities

_(tidak ada — `service-management` tidak berubah requirement-nya, hanya dibaca oleh dua kapabilitas baru di atas)_

## Impact

- `src/pages/DashboardPage.tsx`: implementasi penuh menggantikan placeholder.
- `src/pages/RiwayatPage.tsx` (baru), `src/router.tsx` (rute `/riwayat`), `src/components/Layout.tsx` (tautan nav).
- `src/lib/servis.ts` atau modul baru `src/lib/dashboard.ts` / `src/lib/riwayat.ts`: query baca (`.from().select()`) mengikuti pola `ambilServisAktif`.
- Tidak ada migrasi DB baru — RLS `authenticated` sudah mengizinkan akses penuh ke `layanan_service` dan `mekanik` sejak `0001_init_schema.sql`.
