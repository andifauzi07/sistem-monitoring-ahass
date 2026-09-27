## 1. Migrasi Database

- [x] 1.1 Tulis `supabase/migrations/0003_penugasan_mekanik.sql`: fungsi trigger + trigger `BEFORE UPDATE OF mekanik_id ON layanan_service` (tolak mekanik tidak aktif/tidak hadir; tolak bila `old.status` `Selesai Dikerjakan`/`Sudah Diambil`) — kode error `MEKANIK_TIDAK_TERSEDIA` / `PENUGASAN_TERKUNCI`.
- [x] 1.2 Tambahkan fungsi trigger + trigger `AFTER UPDATE OF mekanik_id ON layanan_service` dengan klausa `WHEN (new.mekanik_id IS NOT NULL AND old.mekanik_id IS DISTINCT FROM new.mekanik_id)` yang menulis baris `riwayat_penugasan_mekanik` (`ditugaskan_oleh = auth.uid()`).
- [x] 1.3 Tambahkan fungsi trigger + trigger `BEFORE UPDATE OF is_active ON mekanik` (`WHEN (new.is_active = false)`) yang menolak dengan kode `MEKANIK_MASIH_BERTUGAS` bila masih ada `layanan_service.mekanik_id` = baris tersebut dengan status selain `Sudah Diambil`.
- [x] 1.4 Revoke akses eksekusi langsung ke fungsi-fungsi trigger baru dari `public, anon, authenticated`, konsisten dengan fungsi trigger lain di `0001_init_schema.sql`.
- [x] 1.5 Pastikan file migrasi idempoten (`create or replace function`, `drop trigger if exists` sebelum `create trigger`) agar aman dijalankan ulang.

## 2. Error Mapping (Frontend)

- [x] 2.1 `src/lib/servisErrors.ts`: tambah kode `MEKANIK_TIDAK_TERSEDIA` dan `PENUGASAN_TERKUNCI` ke `KodeServisError` dan `mapServisError`, dengan pesan Bahasa Indonesia.
- [x] 2.2 `src/lib/mekanikErrors.ts`: tambah kode `MEKANIK_MASIH_BERTUGAS` dengan pesan Bahasa Indonesia yang jelas (mekanik masih menangani kendaraan aktif).

## 3. Lib — Data & Aksi Penugasan

- [x] 3.1 `src/lib/servis.ts`: ubah `ambilServisAktif()` dan `ambilServis()` agar select join `mekanik(nama)`; sesuaikan tipe `Servis`/`ServisDetail` agar menyertakan `mekanik: { nama: string } | null`.
- [x] 3.2 `src/lib/servis.ts`: tambah fungsi `tugaskanMekanik(id: string, mekanikId: string)` — `supabase.from('layanan_service').update({ mekanik_id: mekanikId }).eq('id', id)`, kembalikan `Hasil<null>` lewat `mapServisError`.
- [x] 3.3 `src/lib/mekanik.ts`: tambah `ambilMekanikTersedia()` — query `mekanik` dengan `is_active = true AND status_hadir = true`, untuk mengisi dropdown penugasan.
- [x] 3.4 `src/lib/mekanik.ts`: tambah `ambilKendaraanMekanik(mekanikId: string)` — query `layanan_service` dengan `mekanik_id = mekanikId AND status <> 'Sudah Diambil'`, kembalikan nomor polisi + status (FR-5.8).

## 4. UI — Penugasan di Halaman Detail Servis

- [x] 4.1 `src/pages/ServisDetailPage.tsx`: tambah baris "Mekanik" menampilkan `servis.mekanik?.nama ?? 'Belum ditugaskan'`.
- [x] 4.2 Tambah dropdown mekanik tersedia (dari `ambilMekanikTersedia`) + tombol Simpan, tampil hanya saat servis aktif dan `status !== 'Selesai Dikerjakan'`.
- [x] 4.3 Bila sudah ada mekanik sebelumnya dan SA memilih mekanik lain, tampilkan `ConfirmDialog` "Ganti penugasan mekanik?" sebelum memanggil `tugaskanMekanik`; bila belum ada mekanik (assign pertama), simpan langsung tanpa konfirmasi.
- [x] 4.4 Tampilkan pesan galat dari `tugaskanMekanik` (mis. `MEKANIK_TIDAK_TERSEDIA`, `PENUGASAN_TERKUNCI`) dengan pola yang sama seperti galat status/hapus di halaman ini.

## 5. UI — Dashboard

- [x] 5.1 `src/pages/DashboardPage.tsx`: ganti `s.mekanik_id ?? '-'` menjadi `s.mekanik?.nama ?? '-'` pada kolom Mekanik di tabel Aktifitas Hari Ini.

## 6. UI — Manajemen Mekanik

- [x] 6.1 `src/pages/MekanikPage.tsx`: tambah kontrol disclosure per baris mekanik "Lihat kendaraan yang ditangani" yang memanggil `ambilKendaraanMekanik` on-demand saat dibuka, menampilkan nomor polisi + status.
- [x] 6.2 Pastikan pesan galat `MEKANIK_MASIH_BERTUGAS` dari `nonaktifkanMekanik` tampil di baris mekanik yang gagal dinonaktifkan (pola `galatBaris` yang sudah ada).

## 7. Verifikasi Otomatis (Agent)

- [x] 7.1 Jalankan `npm run lint` — pastikan lolos. (Semua file yang diubah iterasi ini lolos bersih; ada 2 error pre-existing di `src/components/Layout.tsx` dari perubahan tak terkait yang sudah ada di working tree sebelum sesi ini — di luar cakupan iterasi 4b, tidak disentuh.)
- [x] 7.2 Jalankan `npm run build` — pastikan type-check dan build produksi sukses. (Build sukses.)

## 8. Tugas Pengguna (Bukan Agent)

- [x] 8.1 Jalankan `supabase/migrations/0003_penugasan_mekanik.sql` secara manual di Supabase SQL Editor.
- [x] 8.2 Uji manual: tugaskan mekanik baru, reassign, coba tugaskan mekanik tidak hadir/nonaktif (harus ditolak), coba ubah penugasan pada servis `Selesai Dikerjakan`/`Sudah Diambil` (harus terkunci), coba nonaktifkan mekanik yang masih bertugas (harus ditolak), cek kolom Mekanik di Dashboard menampilkan nama, cek "Lihat kendaraan yang ditangani" di halaman Manajemen Mekanik.

## 9. Wajib Tugaskan Mekanik Sebelum Diperiksa (tambahan)

- [x] 9.1 Tulis `supabase/migrations/0004_wajib_mekanik_sebelum_diperiksa.sql`: fungsi trigger + trigger `BEFORE UPDATE OF status ON layanan_service` yang menolak dengan kode `MEKANIK_BELUM_DITUGASKAN` bila `old.status = 'Menunggu Antrian' AND new.status = 'Diperiksa' AND new.mekanik_id IS NULL`. Migrasi terpisah dari `0003` karena `0003` sudah dijalankan pengguna.
- [x] 9.2 Revoke akses eksekusi fungsi trigger baru dari `public, anon, authenticated`.
- [x] 9.3 `src/lib/servisErrors.ts`: tambah kode `MEKANIK_BELUM_DITUGASKAN` ke `KodeServisError` dan `mapServisError`, dengan pesan Bahasa Indonesia.
- [x] 9.4 `src/components/StatusActionButton.tsx`: perluas prop `servis` menerima `mekanik_id: string | null`; nonaktifkan tombol (bukan sembunyikan) saat `arah === 'maju' && servis.status === 'Menunggu Antrian' && tujuan === 'Diperiksa' && !servis.mekanik_id`, dengan `title` menjelaskan alasan.
- [x] 9.5 Verifikasi otomatis: `npm run lint` dan `npm run build` pada file yang diubah. (Keduanya lolos.)
- [x] 9.6 Tugas pengguna: jalankan `0004_wajib_mekanik_sebelum_diperiksa.sql` di Supabase SQL Editor, lalu uji manual — servis baru tanpa mekanik tidak bisa diketuk ke Diperiksa (di daftar maupun detail), setelah mekanik ditugaskan tombol aktif dan berhasil maju.
