## 1. Modul data dashboard

- [x] 1.1 Buat `src/lib/dashboard.ts`: fungsi `ambilServisAktif` sudah ada di `servis.ts` — tambah fungsi `ambilRingkasanMekanik()` yang query `mekanik` (`select('id, status_hadir').eq('is_active', true)`) dan mengembalikan `{ hadir: number, total: number }`.
- [x] 1.2 Di modul yang sama, tambah tipe/helper untuk menghitung `totalUnitAktif` dari hasil `ambilServisAktif()` (cukup `data.length`, tidak perlu query terpisah).

## 2. Halaman Dashboard

- [x] 2.1 Implementasikan `src/pages/DashboardPage.tsx`: panggil `ambilServisAktif()` dan `ambilRingkasanMekanik()`, tampilkan state loading/error mengikuti pola halaman lain (mis. `ServisListPage.tsx`).
- [x] 2.2 Render kartu "Total Unit Entry di Pit" dari jumlah hasil `ambilServisAktif()`.
- [x] 2.3 Render kartu "Mekanik yang Hadir" dari `ambilRingkasanMekanik()` (format "X dari Y"), tetap tampil walau 0/0.
- [x] 2.4 Render tabel "Aktifitas Hari Ini" dari hasil `ambilServisAktif()` dengan kolom Mekanik (selalu "-" karena `mekanik_id` belum diisi), Tipe Motor (`jenis_motor`), Keterangan (`masalah`), Status (pakai `StatusBadge`).
- [x] 2.5 Tampilkan pesan kosong yang jelas bila tidak ada servis aktif (bukan tabel kosong tanpa keterangan).

## 3. Modul data & halaman Riwayat

- [x] 3.1 Buat `src/lib/riwayat.ts`: fungsi `ambilRiwayat(filter: { dariTanggal?: string; sampaiTanggal?: string; nomorPolisi?: string })` yang query `layanan_service` dengan `.eq('status', 'Sudah Diambil')`, filter rentang `tanggal_selesai`, filter `nomor_polisi` (normalisasi via `normalizeNopol` lalu `.ilike`), urut `tanggal_selesai` menurun.
- [x] 3.2 Buat `src/pages/RiwayatPage.tsx`: form filter (rentang tanggal + input nomor polisi) dan tabel hasil (Nomor Polisi, Nama Pembawa, Tipe Motor, Tanggal Selesai).
- [x] 3.3 Tampilkan pesan kosong yang jelas bila belum ada riwayat / hasil filter kosong.
- [x] 3.4 Daftarkan rute `path: 'riwayat'` di `src/router.tsx` di dalam grup `RequireAuth`.
- [x] 3.5 Tambah `NavLink` "Riwayat" di `src/components/Layout.tsx` (grup sama dengan Dashboard/Servis).

## 4. Verifikasi

- [x] 4.1 Jalankan `npm run build` dan pastikan lolos (type-check + build produksi).
- [x] 4.2 Jalankan `npm run lint` dan pastikan lolos.

## 5. Serah terima ke pengguna

- [x] 5.1 (Pengguna) Uji manual: buka `/dashboard` dan `/riwayat` di browser, cek angka kartu, isi tabel, dan hasil filter riwayat sesuai data di Supabase.
- [x] 5.2 (Pengguna) Commit perubahan bila uji manual lolos.
