## Context

Iterasi 0 menyiapkan Supabase client (`src/lib/supabase.ts`), router (`createBrowserRouter` dari `react-router` v8, dengan satu `Layout` dan rute `/`, `/login`, `/dashboard`, `*`), serta skema database.

Hal yang sudah tersedia dari skema:
- Trigger `on_auth_user_created` otomatis membuat baris `service_advisors` untuk setiap user di `auth.users`.
- RLS memberi akses penuh ke role `authenticated`.

Akibatnya, siapa pun yang berhasil membuat akun di Supabase Auth otomatis menjadi Service Advisor dengan akses penuh ke data. Publishable key juga ada di bundle JavaScript publik, sehingga endpoint sign-up bisa dipanggil langsung tanpa halaman registrasi.

## Goals / Non-Goals

**Goals:**
- FR-1.1–FR-1.3: login email dan password, pesan error kredensial, dan logout.
- Sesi persisten dan proteksi rute tanpa kedipan (*flash*) redirect saat refresh.
- Pola proteksi yang bisa dipakai ulang oleh rute Service Advisor pada Iterasi 2–4b.
- Menutup jalur pembuatan akun liar lewat pengaturan Supabase.

**Non-Goals:**
- Ganti password dan edit profil (FR-6.1, Iterasi 4), lupa atau reset password, dan halaman registrasi.
- Perubahan RLS atau migrasi database.
- Verifikasi deep link Vercel.
- Role atau otorisasi bertingkat. Semua user yang login adalah Service Advisor.

## Decisions

### 1. `AuthProvider` berbasis React Context, bukan loader React Router

`AuthProvider` membungkus `RouterProvider` di `main.tsx`:
- Saat mount, provider memanggil `supabase.auth.getSession()`.
- Provider berlangganan `supabase.auth.onAuthStateChange` untuk login, logout, refresh token, dan sinkronisasi antar-tab (Supabase menyimpan sesi di `localStorage`).
- Hook `useAuth()` mengembalikan `{ status: 'loading' | 'authenticated' | 'guest', session, user, signIn, signOut }`.

*Alternatif:* `loader` pada data router yang memanggil `getSession()` di setiap navigasi. Ditolak karena:
- loader tidak otomatis bereaksi terhadap `onAuthStateChange` (logout di tab lain atau token kedaluwarsa), sehingga tetap butuh context agar header ikut berubah;
- memakai dua mekanisme untuk satu hal menambah kompleksitas.

Context cukup untuk skala aplikasi ini.

Status awal adalah `loading`, dan baru berubah setelah `getSession()` selesai. Langganan `onAuthStateChange` memperbarui `session` dan `status`. Callback-nya hanya mengubah state dan tidak memanggil API Supabase lain di dalamnya, sesuai anjuran Supabase untuk menghindari deadlock.

Jika Supabase belum dikonfigurasi (`isSupabaseConfigured === false`), status langsung menjadi `guest` tanpa memanggil API.

### 2. Route guard sebagai layout route: `RequireAuth` dan `GuestOnly`

```
Layout
 ├─ /                  PublicMonitoringPage
 ├─ GuestOnly
 │   └─ /login         LoginPage
 ├─ RequireAuth
 │   └─ /dashboard     DashboardPage   (rute SA iterasi berikutnya ditambahkan di sini)
 └─ *                  NotFoundPage
```

- `RequireAuth`:
  - saat `loading`, menampilkan spinner;
  - saat `guest`, menjalankan `<Navigate to="/login" replace state={{ from: location }} />`;
  - saat `authenticated`, merender `<Outlet />`.
- `GuestOnly`:
  - saat `loading`, menampilkan spinner;
  - saat `authenticated`, menjalankan `<Navigate to={from ?? '/dashboard'} replace />`;
  - saat `guest`, merender `<Outlet />`.

Pola layout route ini membuat rute baru cukup ditaruh sebagai child, tanpa membungkus setiap halaman satu per satu.

`replace` dipakai supaya `/dashboard` yang ditolak tidak tertinggal di history. Hasilnya, tombol back setelah logout tidak menampilkan dashboard. Kalaupun rute itu terbuka dari history, guard akan mengarahkan ulang.

Redirect setelah login ditangani oleh `GuestOnly` yang bereaksi terhadap perubahan status menjadi `authenticated`. `LoginPage` sendiri tidak perlu memanggil `navigate`. Dengan begitu hanya ada satu sumber kebenaran, dan login dari tab lain juga ikut ditangani.

Nilai `from` hanya diterima jika berupa path internal yang diawali `/`. Ini mencegah open redirect, walaupun sumbernya adalah `location.state` dan bukan query string.

### 3. Pemetaan error login

`signInWithPassword` mengembalikan `AuthError`. Pemetaannya:
- `error.code === 'invalid_credentials'`, atau status 400 dengan pesan kredensial, menjadi "Email atau password salah".
- Error jaringan (`AuthRetryableFetchError` atau status 0) menjadi "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi."
- `email_not_confirmed` menjadi "Akun belum dikonfirmasi. Hubungi admin." Ini untuk berjaga-jaga jika admin lupa mencentang *Auto Confirm*.
- Error lain menjadi "Terjadi kesalahan. Coba lagi."

Pesan kredensial sengaja generik agar tidak membocorkan email mana yang terdaftar. Validasi field kosong memakai atribut `required` dan `type="email"` bawaan HTML, ditambah pengecekan sebelum submit.

### 4. Kebijakan akun lewat pengaturan Supabase, bukan RLS

Di dashboard Supabase, buka **Authentication → Sign In / Providers**, lalu matikan *Allow new users to sign up* dan *Allow anonymous sign-ins*. Akun dibuat lewat **Authentication → Users → Add user**, yang tetap berfungsi walaupun sign-up publik mati.

*Alternatif:* mengganti policy `using (true)` dengan `exists (select 1 from service_advisors where id = auth.uid())`. Ditolak untuk iterasi ini karena trigger tetap membuat baris `service_advisors` untuk setiap user baru, sehingga cek ini tidak menambah perlindungan selama sign-up terbuka. Pengerasan RLS baru bermakna jika kelak ada flag seperti `aktif`, dan itu belum ada di PRD.

### 5. Letak file

- `src/lib/auth.tsx`: `AuthProvider`, `useAuth`, dan fungsi pemetaan error. Pemetaan error boleh dipisah ke `src/lib/authErrors.ts` jika aturan lint `react-refresh/only-export-components` mengharuskannya.
- `src/components/RequireAuth.tsx` dan `src/components/GuestOnly.tsx`.
- `src/components/LoadingScreen.tsx`: spinner yang dipakai bersama.

## Risks / Trade-offs

- **Sign-up publik lupa dimatikan**, sehingga siapa pun bisa membuat akun dengan akses penuh.
  → Langkah ini dimasukkan ke tasks sebagai tugas pengguna, didokumentasikan di `supabase/README.md`, dan disertai perintah `curl` untuk verifikasi bahwa sign-up ditolak.
- **Sesi disimpan di `localStorage`**, sehingga rentan jika ada XSS.
  → Ini default Supabase untuk SPA. React sudah meng-escape output secara default, dan kita tidak memakai `dangerouslySetInnerHTML`. Risiko ini diterima.
- **Proteksi rute hanya di sisi klien.** Kode halaman dashboard tetap terunduh oleh tamu.
  → Data tetap aman karena dilindungi RLS: `anon` tidak punya akses tabel. Guard frontend hanya untuk pengalaman pengguna.
- **Kode error Supabase bisa berubah antar versi.**
  → Pemetaan memakai `error.code` dengan fallback ke pesan umum, sehingga pesan terburuk yang mungkin tampil adalah "Terjadi kesalahan", bukan crash.
- **StrictMode memanggil effect dua kali di mode dev**, sehingga langganan bisa terdaftar ganda.
  → Cleanup effect memanggil `subscription.unsubscribe()`.

## Migration Plan

1. Pengguna mematikan sign-up publik dan anonymous sign-ins di dashboard Supabase. Ini bisa dilakukan sebelum atau sesudah deploy karena tidak bergantung pada kode.
2. Deploy kode seperti biasa. Tidak ada migrasi database.
3. Rollback cukup dengan revert commit. Pengaturan Supabase aman dibiarkan mati.

## Open Questions

Tidak ada. Keputusan scope sudah dikonfirmasi pengguna saat eksplorasi.
