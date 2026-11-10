## 1. Skema Database & Tipe Data

- [x] 1.1 Buat migrasi SQL `supabase/migrations/0006_riwayat_notifikasi.sql` yang mendefinisikan tabel `riwayat_notifikasi`, foreign key ke `layanan_service` (cascade on delete), indeks, dan kebijakan Row Level Security (RLS).
- [x] 1.2 Perbarui file definisi tipe data `src/types/database.ts` agar mencakup tabel `riwayat_notifikasi`.

## 2. Supabase Edge Function `kirim-wa`

- [x] 2.1 Buat fungsi utilitas normalisasi nomor telepon (konversi format `08xx`/`+62xx` ke `628xx`) dan penyusun template pesan resmi AHASS Kota Mamuju.
- [x] 2.2 Implementasikan handler utama Supabase Edge Function di `supabase/functions/kirim-wa/index.ts` untuk memverifikasi token auth SA, mengambil data detail servis dan mekanik, memanggil endpoint WapiSender (`https://wapisender.id/api/message/send`), dan mencatat hasilnya ke `riwayat_notifikasi`.
- [x] 2.3 Siapkan konfigurasi environment/secrets (`WAPISENDER_API_KEY`, `WAPISENDER_DEVICE_KEY`, `APP_PUBLIC_URL`) beserta panduan penerapannya.

## 3. Integrasi Frontend Client & UI Feedback

- [x] 3.1 Buat modul helper `src/lib/notifikasi.ts` untuk fungsi pemanggilan Edge Function `kirim-wa` dan pengambilan riwayat notifikasi terbaru suatu layanan.
- [x] 3.2 Integrasikan pemanggilan otomatis pengiriman notifikasi saat Service Advisor berhasil memajukan status ke `Selesai Dikerjakan`.
- [x] 3.3 Tambahkan tampilan status notifikasi WhatsApp (indikator berhasil/gagal, waktu kirim) dan tombol aksi manual "Kirim Ulang WhatsApp" pada `src/pages/ServisDetailPage.tsx`.

## 4. Verifikasi & Pengujian

- [x] 4.1 Jalankan pemeriksaan linting dan validasi build (`npm run build`) untuk memastikan tidak ada kesalahan kompilasi TypeScript.
- [x] 4.2 Verifikasi pengujian skenario normalisasi nomor telepon dengan berbagai variasi input pelanggan.
- [x] 4.3 Verifikasi ketahanan sistem ketika gateway mengembalikan galat (misal nomor tidak valid atau device disconnected) agar status servis tetap terjaga dan tombol kirim ulang berfungsi dengan baik.
