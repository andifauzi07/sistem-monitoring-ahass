## Why

Halaman `/dashboard` saat ini bisa dibuka siapa saja, dan `/login` masih placeholder. Iterasi 2–4 akan menambahkan pengelolaan data servis dan mekanik di area Service Advisor, jadi area itu harus terlindungi login lebih dulu. Iterasi 1 (PRD Bagian 13) mengimplementasikan FR-1.1–FR-1.3: login email dan password lewat Supabase Auth, pesan error untuk kredensial tidak valid, dan logout.

## What Changes

- Halaman `/login` berfungsi: form email dan password memanggil Supabase Auth `signInWithPassword`. Jika kredensial tidak valid, pengguna tetap di halaman login dengan pesan generik "Email atau password salah".
- Status sesi disediakan secara global lewat `AuthProvider` dengan tiga keadaan: `loading`, `authenticated`, dan `guest`. Sesi tetap tersimpan setelah refresh (persistensi bawaan Supabase).
- Rute terproteksi: `/dashboard`, dan rute Service Advisor lain di iterasi berikutnya, hanya bisa dibuka saat `authenticated`.
  - Selama `loading`, tampil indikator memuat, bukan redirect.
  - Saat `guest`, pengguna diarahkan ke `/login`, lalu kembali ke tujuan asal setelah login berhasil.
- `/login` mengarahkan pengguna yang sudah login ke `/dashboard`. Halaman publik `/` tetap tampil apa adanya walaupun pengguna sudah login.
- Navigasi header menyesuaikan status sesi. Tamu melihat "Masuk". Pengguna yang sudah login melihat "Dashboard" dan tombol "Keluar", yang memanggil `signOut` lalu mengarahkan ke `/login`.
- Kebijakan akun: hanya Service Advisor yang boleh login. Akun dibuat manual oleh admin lewat dashboard Supabase, lalu sign-up publik dan anonymous sign-ins dimatikan di pengaturan Supabase Auth. Langkah ini didokumentasikan di `supabase/README.md`. RLS dan skema database tidak berubah.
- Di luar scope:
  - ganti password dan edit profil (FR-6.1, Iterasi 4);
  - lupa atau reset password;
  - halaman registrasi;
  - verifikasi deep link Vercel.

## Capabilities

### New Capabilities

- `sa-authentication`: Login, logout, persistensi sesi, dan proteksi rute untuk Service Advisor berbasis Supabase Auth, termasuk kebijakan bahwa akun hanya dibuat oleh admin.

### Modified Capabilities

- `project-foundation`: Requirement "Routing SPA dengan rute placeholder" berubah. `/login` dan `/dashboard` tidak lagi placeholder bebas akses: `/login` menjadi form login fungsional dan `/dashboard` menjadi rute terproteksi.

## Impact

- **Kode baru:** konteks autentikasi (provider dan hook), komponen rute terproteksi, dan komponen rute khusus tamu.
- **Kode diubah:**
  - `src/main.tsx`: membungkus router dengan provider;
  - `src/router.tsx`: menambah pembungkus proteksi;
  - `src/pages/LoginPage.tsx`: form login fungsional;
  - `src/components/Layout.tsx`: navigasi sesuai status sesi dan tombol logout;
  - `src/pages/DashboardPage.tsx`: teks placeholder.
- **Dependencies:** tidak ada yang baru. `@supabase/supabase-js` sudah menyediakan Auth.
- **Database:** tidak ada migrasi baru.
- **Sistem eksternal:** pengaturan Supabase Auth diubah manual oleh pengguna (matikan sign-up publik dan anonymous sign-ins).
- **Dokumentasi:** `supabase/README.md` (kebijakan akun), `CLAUDE.md` (progres iterasi).
