## 1. Konteks Autentikasi

- [x] 1.1 Buat `src/lib/auth.tsx`:
  - `AuthProvider` dengan status awal `loading`, `getSession()` saat mount, dan langganan `onAuthStateChange` dengan cleanup `unsubscribe()`;
  - status langsung `guest` jika `isSupabaseConfigured === false`.
- [x] 1.2 Ekspor hook `useAuth()` yang mengembalikan `{ status, session, user, signIn, signOut }`. `signIn` membungkus `signInWithPassword` dan mengembalikan pesan error hasil pemetaan, atau `null` jika berhasil.
- [x] 1.3 Buat fungsi pemetaan `AuthError` ke pesan Bahasa Indonesia:
  - `invalid_credentials` → "Email atau password salah";
  - jaringan → pesan server tidak dapat dihubungi;
  - `email_not_confirmed` → "Akun belum dikonfirmasi. Hubungi admin.";
  - selain itu → "Terjadi kesalahan. Coba lagi."

  Pisahkan ke `src/lib/authErrors.ts` jika lint `react-refresh` mengharuskan.

- [x] 1.4 Bungkus `RouterProvider` dengan `AuthProvider` di `src/main.tsx`.

## 2. Route Guard

- [x] 2.1 Buat `src/components/LoadingScreen.tsx`, berisi spinner dan teks "Memuat…".
- [x] 2.2 Buat `src/components/RequireAuth.tsx`:
  - `loading` → `LoadingScreen`;
  - `guest` → `<Navigate to="/login" replace state={{ from: location }} />`;
  - `authenticated` → `<Outlet />`.
- [x] 2.3 Buat `src/components/GuestOnly.tsx`:
  - `loading` → `LoadingScreen`;
  - `authenticated` → `<Navigate replace>` ke `from` jika berupa path internal yang diawali `/` (dan bukan `//`), selain itu ke `/dashboard`;
  - `guest` → `<Outlet />`.
- [x] 2.4 Susun ulang `src/router.tsx`: `/login` menjadi child `GuestOnly`, `/dashboard` menjadi child `RequireAuth`, dan `/` serta `*` tetap publik.

## 3. Halaman & Navigasi

- [x] 3.1 Implementasikan `src/pages/LoginPage.tsx`:
  - field email (`type="email"`, `required`, `autoComplete="username"`) dan password (`required`, `autoComplete="current-password"`);
  - tombol nonaktif dan berlabel "Memproses…" selama submit;
  - pesan error dalam area `role="alert"`, dengan nilai email tetap terisi;
  - form nonaktif dan pesan konfigurasi tampil jika Supabase belum dikonfigurasi;
  - tanpa tautan registrasi atau lupa password.
- [x] 3.2 Perbarui `src/components/Layout.tsx`:
  - "Cek Status" selalu tampil;
  - `guest` melihat "Masuk";
  - `authenticated` melihat "Dashboard" dan tombol "Keluar" (`signOut()` lalu `navigate('/login', { replace: true })`);
  - saat `loading`, tautan sesi tidak ditampilkan agar tidak berkedip.
- [x] 3.3 Perbarui teks placeholder `src/pages/DashboardPage.tsx`, misalnya sapaan dengan email pengguna yang login. Hapus kalimat "akan dilindungi login mulai Iterasi 1".

## 4. Dokumentasi

- [x] 4.1 Tambahkan bagian "Kebijakan akun & keamanan Auth" di `supabase/README.md`:
  - langkah mematikan _Allow new users to sign up_ dan _Allow anonymous sign-ins_;
  - catatan bahwa _Add user_ dari dashboard tetap berfungsi;
  - perintah `curl` ke `/auth/v1/signup` untuk memastikan sign-up ditolak.

## 5. Verifikasi Otomatis (agent)

- [x] 5.1 `npm run build` lolos tanpa error.
- [x] 5.2 `npm run lint` lolos tanpa error.

## 6. Pengaturan & Uji Manual (dilakukan pengguna)

- [x] 6.1 Di Supabase Dashboard → Authentication → Sign In / Providers: matikan sign-up publik dan anonymous sign-ins. Jalankan `curl` dari README dan pastikan ditolak.
- [x] 6.2 Buka `/dashboard` tanpa login. Pastikan diarahkan ke `/login`, lalu setelah login kembali ke `/dashboard`.
- [x] 6.3 Login dengan password salah, lalu dengan email tidak terdaftar. Keduanya harus menampilkan "Email atau password salah", dan email tetap terisi.
- [x] 6.4 Refresh `/dashboard` saat sudah login. Dashboard harus tetap tampil tanpa berkedip ke `/login`.
- [x] 6.5 Saat sudah login, buka `/login` (harus diarahkan ke `/dashboard`) dan `/` (halaman publik tetap tampil).
- [x] 6.6 Tekan "Keluar". Pastikan diarahkan ke `/login`, dan tombol back tidak menampilkan dashboard.
- [x] 6.7 Buka dua tab, lalu logout di salah satunya. Tab lain harus beralih ke `/login`.
- [x] 6.8 Periksa header untuk tamu ("Cek Status", "Masuk") dan untuk Service Advisor ("Cek Status", "Dashboard", "Keluar").

## 7. Penutupan

- [x] 7.1 Perbarui baris "Iterasi terakhir yang selesai" di `CLAUDE.md` menjadi Iterasi 1, setelah pengguna mengonfirmasi uji manual lolos.
