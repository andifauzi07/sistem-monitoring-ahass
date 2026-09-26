# sa-authentication Specification

## Purpose
Login, logout, persistensi sesi, dan proteksi rute untuk Service Advisor berbasis Supabase Auth, termasuk kebijakan bahwa akun hanya dibuat oleh admin.

## Requirements
### Requirement: Login Service Advisor dengan email dan password

Halaman `/login` SHALL menyediakan form email dan password yang mengautentikasi pengguna lewat Supabase Auth (`signInWithPassword`). Tombol kirim MUST dinonaktifkan dan menampilkan status memproses selama permintaan berjalan. Setelah login berhasil, pengguna SHALL diarahkan ke halaman tujuan asal jika ada, atau ke `/dashboard`.

#### Scenario: Login berhasil

- **WHEN** Service Advisor memasukkan email dan password yang valid lalu mengirim form
- **THEN** sesi terbentuk dan pengguna diarahkan ke `/dashboard`

#### Scenario: Login berhasil setelah diarahkan dari rute terproteksi

- **WHEN** tamu membuka `/dashboard`, diarahkan ke `/login`, lalu login dengan kredensial valid
- **THEN** pengguna dikembalikan ke `/dashboard`

#### Scenario: Form tidak lengkap

- **WHEN** pengguna mengirim form dengan email atau password kosong
- **THEN** permintaan tidak dikirim ke Supabase dan field yang kosong ditandai wajib diisi

### Requirement: Pesan error untuk kredensial tidak valid

Jika autentikasi gagal karena kredensial tidak valid, pengguna SHALL tetap berada di `/login` dengan pesan "Email atau password salah". Pesan MUST NOT membedakan antara email yang tidak terdaftar dan password yang salah. Kegagalan lain, seperti jaringan atau konfigurasi, SHALL menampilkan pesan umum yang berbeda dalam Bahasa Indonesia. Nilai email yang sudah diketik MUST tetap ada di form.

#### Scenario: Password salah

- **WHEN** pengguna login dengan email terdaftar dan password yang salah
- **THEN** pengguna tetap di `/login`, pesan "Email atau password salah" tampil, dan field email tetap terisi

#### Scenario: Email tidak terdaftar

- **WHEN** pengguna login dengan email yang tidak terdaftar
- **THEN** pesan yang tampil sama persis: "Email atau password salah"

#### Scenario: Gangguan jaringan

- **WHEN** permintaan login gagal karena Supabase tidak dapat dijangkau
- **THEN** tampil pesan bahwa server tidak dapat dihubungi, bukan pesan kredensial salah

#### Scenario: Supabase belum dikonfigurasi

- **WHEN** variabel env Supabase kosong dan pengguna membuka `/login`
- **THEN** form tidak dapat dikirim dan pesan konfigurasi ditampilkan

### Requirement: Status sesi global dan persisten

Aplikasi SHALL menyediakan status sesi global dengan tiga keadaan: `loading` (sesi awal belum selesai dibaca), `authenticated`, dan `guest`. Sesi SHALL tetap tersimpan setelah halaman di-refresh atau browser dibuka kembali, sampai pengguna logout atau sesi kedaluwarsa. Perubahan sesi dari tab lain maupun dari kedaluwarsa token MUST tercermin tanpa reload.

#### Scenario: Refresh saat sudah login

- **WHEN** Service Advisor yang sudah login me-refresh halaman `/dashboard`
- **THEN** halaman `/dashboard` tetap tampil tanpa diarahkan ke `/login`

#### Scenario: Logout di tab lain

- **WHEN** Service Advisor logout di satu tab sementara tab lain membuka `/dashboard`
- **THEN** tab lain beralih ke keadaan `guest` dan diarahkan ke `/login`

### Requirement: Proteksi rute Service Advisor

Rute area Service Advisor (`/dashboard`, serta rute Service Advisor pada iterasi berikutnya) SHALL hanya dapat dibuka dalam keadaan `authenticated`.

- Selama keadaan `loading`, aplikasi MUST menampilkan indikator memuat dan MUST NOT mengarahkan ke `/login`.
- Dalam keadaan `guest`, aplikasi SHALL mengarahkan ke `/login` sambil mengingat rute tujuan asal.
- Halaman publik `/` MUST tetap dapat dibuka dalam keadaan apa pun.

#### Scenario: Tamu membuka dashboard

- **WHEN** pengguna yang belum login membuka `/dashboard`
- **THEN** pengguna diarahkan ke `/login` dan konten dashboard tidak ditampilkan

#### Scenario: Sesi masih dimuat

- **WHEN** Service Advisor yang sudah login membuka `/dashboard` langsung dan sesi masih dibaca
- **THEN** indikator memuat tampil sampai sesi terbaca, lalu dashboard tampil tanpa sempat berpindah ke `/login`

#### Scenario: Halaman publik saat sudah login

- **WHEN** Service Advisor yang sudah login membuka `/`
- **THEN** halaman monitoring publik tetap ditampilkan tanpa redirect

### Requirement: Halaman login khusus tamu

Rute `/login` SHALL mengarahkan pengguna dalam keadaan `authenticated` ke `/dashboard`.

#### Scenario: Pengguna login membuka halaman login

- **WHEN** Service Advisor yang sudah login membuka `/login`
- **THEN** pengguna diarahkan ke `/dashboard`

### Requirement: Logout

Aplikasi SHALL menyediakan tombol "Keluar" yang hanya tampil dalam keadaan `authenticated`. Tombol ini mengakhiri sesi lewat Supabase Auth `signOut` lalu mengarahkan pengguna ke `/login`. Setelah logout, rute terproteksi MUST NOT dapat dibuka tanpa login ulang, termasuk lewat tombol back browser.

#### Scenario: Logout berhasil

- **WHEN** Service Advisor menekan "Keluar"
- **THEN** sesi berakhir dan pengguna diarahkan ke `/login`

#### Scenario: Kembali setelah logout

- **WHEN** setelah logout pengguna menekan tombol back browser menuju `/dashboard`
- **THEN** pengguna kembali diarahkan ke `/login`

### Requirement: Navigasi sesuai status sesi

Header SHALL menampilkan tautan "Masuk" dalam keadaan `guest`. Dalam keadaan `authenticated`, header SHALL menampilkan tautan "Dashboard" dan tombol "Keluar". Tautan "Cek Status" (`/`) SHALL selalu tampil.

#### Scenario: Header untuk tamu

- **WHEN** tamu membuka aplikasi
- **THEN** header menampilkan "Cek Status" dan "Masuk", tanpa "Dashboard" maupun "Keluar"

#### Scenario: Header untuk Service Advisor

- **WHEN** Service Advisor yang sudah login membuka aplikasi
- **THEN** header menampilkan "Cek Status", "Dashboard", dan "Keluar", tanpa "Masuk"

### Requirement: Akun hanya dibuat oleh admin

Aplikasi MUST NOT menyediakan halaman atau fungsi registrasi. Akun Service Advisor SHALL dibuat oleh admin lewat dashboard Supabase. Proyek Supabase SHALL dikonfigurasi dengan sign-up publik dan anonymous sign-ins dinonaktifkan, dan langkah konfigurasi ini MUST didokumentasikan di `supabase/README.md`.

#### Scenario: Upaya sign-up langsung ke API

- **WHEN** seseorang memanggil endpoint sign-up Supabase Auth memakai publishable key
- **THEN** permintaan ditolak dan tidak ada user baru di `auth.users`

#### Scenario: Tidak ada jalur registrasi di aplikasi

- **WHEN** pengguna menelusuri seluruh halaman aplikasi
- **THEN** tidak ada tautan, form, atau rute untuk mendaftar akun
