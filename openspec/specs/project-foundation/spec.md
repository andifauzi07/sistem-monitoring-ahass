# project-foundation Specification

## Purpose
TBD - created by archiving change iterasi-0-setup. Update Purpose after archive.
## Requirements
### Requirement: Styling berbasis Tailwind CSS

Aplikasi SHALL menggunakan Tailwind CSS v4 sebagai satu-satunya basis styling, dan MUST NOT menyisakan CSS atau aset bawaan template Vite (counter, logo, hero).

#### Scenario: Utility class Tailwind diterapkan

- **WHEN** sebuah komponen memakai utility class Tailwind (mis. `bg-red-600`)
- **THEN** gaya tersebut diterapkan di browser pada mode `dev` maupun hasil `build`

#### Scenario: Template bawaan dihapus

- **WHEN** aplikasi dibuka
- **THEN** tidak ada elemen template Vite (tombol counter, logo Vite/React) yang tampil

### Requirement: Routing SPA dengan rute placeholder

Aplikasi SHALL menyediakan routing sisi klien dengan rute `/` (monitoring publik), `/login`, dan `/dashboard`, masing-masing berupa halaman placeholder. Rute yang tidak dikenal SHALL menampilkan halaman "tidak ditemukan".

#### Scenario: Navigasi ke rute yang dikenal

- **WHEN** pengguna membuka `/login`
- **THEN** halaman placeholder login ditampilkan tanpa reload penuh saat berpindah dari rute lain

#### Scenario: Rute tidak dikenal

- **WHEN** pengguna membuka `/tidak-ada`
- **THEN** halaman "tidak ditemukan" ditampilkan beserta tautan kembali ke `/`

### Requirement: Supabase client tunggal dari environment

Aplikasi SHALL membuat satu instance Supabase client yang dibaca dari `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`. Repositori MUST menyertakan `.env.example` dan MUST NOT meng-commit file `.env` berisi nilai sebenarnya.

#### Scenario: Env tersedia

- **WHEN** kedua variabel env terisi
- **THEN** modul `src/lib/supabase.ts` mengekspor client yang siap dipakai

#### Scenario: Env tidak tersedia

- **WHEN** salah satu variabel env kosong
- **THEN** aplikasi menampilkan pesan konfigurasi yang jelas, bukan layar kosong atau error tak tertangani

### Requirement: Pengecekan koneksi Supabase

Aplikasi SHALL menampilkan indikator status koneksi ke Supabase berdasarkan test query sungguhan terhadap database.

#### Scenario: Koneksi berhasil

- **WHEN** halaman placeholder dimuat dan Supabase dapat dijangkau dengan skema terpasang
- **THEN** indikator menampilkan status "Terhubung"

#### Scenario: Koneksi gagal

- **WHEN** Supabase tidak dapat dijangkau atau query gagal
- **THEN** indikator menampilkan status gagal beserta pesan error

### Requirement: Build dan deployment Vercel

Proyek SHALL lolos `npm run build` dan `npm run lint` tanpa error, dan SHALL dapat di-deploy ke Vercel dengan semua rute SPA dapat diakses langsung (deep link).

#### Scenario: Build lokal

- **WHEN** `npm run build` dijalankan
- **THEN** proses selesai tanpa error TypeScript maupun Vite

#### Scenario: Deep link di Vercel

- **WHEN** pengguna membuka URL produksi `/dashboard` secara langsung
- **THEN** Vercel menyajikan `index.html` dan router menampilkan halaman yang sesuai (bukan 404 Vercel)

