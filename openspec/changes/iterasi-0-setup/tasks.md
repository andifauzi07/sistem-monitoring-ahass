## 1. Frontend Tooling

- [x] 1.1 Install `tailwindcss`, `@tailwindcss/vite`, `react-router`, `@supabase/supabase-js`
- [x] 1.2 Tambahkan plugin Tailwind ke `vite.config.ts`; ganti isi `src/index.css` dengan `@import "tailwindcss";` + blok `@theme` (token warna merek)
- [x] 1.3 Hapus template Vite: `src/App.tsx`, `src/App.css`, `src/assets/*`, aset contoh di `public/`; perbarui `<title>` dan `lang="id"` di `index.html`
- [x] 1.4 Verifikasi `npm run build` dan `npm run lint` lolos

## 2. Supabase Client & Utilitas

- [x] 2.1 Buat `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) dan pastikan `.env` / `.env.local` ada di `.gitignore`
- [x] 2.2 Buat `src/lib/supabase.ts`: client tunggal bertipe `Database`, plus ekspor flag/pesan jika env kosong
- [x] 2.3 Buat `src/types/database.ts`: enum `StatusServis` dan tipe Row/Insert/Update untuk 6 tabel + tipe fungsi `cek_status`
- [x] 2.4 Buat `src/lib/nopol.ts`: `normalizeNopol()` yang setara dengan `normalize_nopol` di SQL

## 3. Routing & Halaman Placeholder

- [x] 3.1 Buat `src/components/Layout.tsx` (header + `<Outlet/>`, responsif) dan `src/components/ConnectionStatus.tsx` (panggil `rpc('cek_status')`, tampilkan loading/Terhubung/Gagal + pesan)
- [x] 3.2 Buat halaman `PublicMonitoringPage` (`/`), `LoginPage` (`/login`), `DashboardPage` (`/dashboard`), `NotFoundPage` (`*`)
- [x] 3.3 Buat `src/router.tsx` dengan `createBrowserRouter` dan pasang `RouterProvider` di `src/main.tsx`
- [x] 3.4 Tampilkan pesan konfigurasi yang jelas bila env Supabase kosong (tanpa crash)
- [x] 3.5 Verifikasi `npm run build` dan `npm run lint` lolos

## 4. Skema Database (`supabase/migrations/0001_init_schema.sql`)

- [x] 4.1 Enum `status_servis` (5 nilai berurutan) dan fungsi `normalize_nopol(text)`
- [x] 4.2 Tabel `service_advisors` (FK ke `auth.users` on delete cascade), `mekanik`, `pelanggan` (`nomor_polisi` unique)
- [x] 4.3 Tabel `layanan_service` dengan semua kolom PRD 7.4, FK, default status `Menunggu Antrian`, `tanggal_masuk default now()`; index pada `status`, `tanggal_masuk`, `mekanik_id`, `nomor_polisi`
- [x] 4.4 Partial unique index satu servis aktif per `pelanggan_id` (`status <> 'Sudah Diambil'`)
- [x] 4.5 Tabel `riwayat_status` (`status_baru` enum, `diubah_oleh` nullable) dan `riwayat_penugasan_mekanik`
- [x] 4.6 Trigger: `on_auth_user_created`, `trg_normalize_nopol` (pelanggan & layanan_service), `trg_log_status`, `trg_set_updated_at`
- [x] 4.7 RLS aktif di semua tabel + policy `authenticated` akses penuh; tanpa policy `anon`
- [x] 4.8 Fungsi `cek_status(nopol text)` SECURITY DEFINER, input < 3 karakter → kosong, pencocokan persis, kolom tersanitasi; `revoke` dari public, `grant execute` ke `anon, authenticated`
- [x] 4.9 Buat `supabase/README.md` berisi cara menjalankan migrasi via SQL Editor dan query verifikasi (cek enum ditolak, nopol ternormalisasi, anon tidak bisa select)

## 5. Verifikasi dengan Supabase (butuh tindakan pengguna)

- [ ] 5.1 Pengguna menjalankan migrasi di SQL Editor dan mengisi `.env` lokal
- [ ] 5.2 `npm run dev` → indikator koneksi menampilkan "Terhubung"
- [ ] 5.3 Pengguna membuat 1 user Service Advisor di Supabase Auth → baris `service_advisors` terbentuk

## 6. Deployment & Dokumentasi

- [x] 6.1 Tambahkan `vercel.json` (SPA rewrite ke `/index.html`)
- [x] 6.2 `git init` + commit awal (tanpa `.env`)
- [ ] 6.3 Pengguna push ke GitHub, import ke Vercel, isi env var → deep link `/dashboard` dapat dibuka dan indikator "Terhubung"
- [ ] 6.4 Perbarui `README.md` (setup lokal) dan `CLAUDE.md` (Build & Test Commands, keputusan status/pelanggan/RPC yang sudah dikunci, progres "Iterasi 0 selesai")
