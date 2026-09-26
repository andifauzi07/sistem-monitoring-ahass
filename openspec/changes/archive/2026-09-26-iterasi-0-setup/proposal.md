## Why

Proyek baru berupa scaffold Vite + React + TypeScript bawaan. Tailwind, Supabase client, struktur folder, skema database, dan deployment belum ada, sehingga Iterasi 1–10 (PRD Bagian 13) belum punya fondasi untuk dibangun. Iterasi 0 menyiapkan fondasi tersebut dan mengunci keputusan skema yang akan dipakai oleh semua iterasi berikutnya.

## What Changes

- Memasang Tailwind CSS v4 (plugin `@tailwindcss/vite`) sebagai basis styling dan membersihkan aset/template bawaan Vite.
- Menambahkan `react-router` dengan rute placeholder: `/` (monitoring publik), `/login`, dan `/dashboard`.
- Menambahkan `@supabase/supabase-js` dengan satu instance client di `src/lib/supabase.ts` yang membaca `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari env, beserta `.env.example`.
- Menambahkan halaman placeholder yang menjalankan test query ke Supabase dan menampilkan status koneksi (DoD Iterasi 0).
- Membuat migrasi SQL `supabase/migrations/` berisi skema lengkap PRD Bagian 7:
  - enum `status_servis` dengan 5 nilai yang sudah dikonfirmasi pengguna: `Menunggu Antrian`, `Diperiksa`, `Dikerjakan`, `Selesai Dikerjakan`, `Sudah Diambil`;
  - tabel `service_advisors`, `mekanik`, `pelanggan`, `layanan_service`, `riwayat_status`, `riwayat_penugasan_mekanik`;
  - model **pelanggan = kendaraan** (`pelanggan.nomor_polisi` unik; `layanan_service` menyimpan `nama_pembawa`/`nomor_wa` per kunjungan);
  - trigger: sinkronisasi `auth.users` → `service_advisors`, log otomatis `riwayat_status`, dan `updated_at`;
  - RLS: `authenticated` mendapat akses penuh, `anon` tidak punya akses tabel;
  - RPC `cek_status(nopol)` `SECURITY DEFINER` untuk akses publik tanpa membocorkan nama/nomor WA.
- Menambahkan `vercel.json` (SPA rewrite), inisialisasi git, dan deploy awal ke Vercel.
- Memperbarui `CLAUDE.md` (perintah build/dev dan progres iterasi).

## Capabilities

### New Capabilities

- `project-foundation`: Fondasi frontend (Tailwind, routing, struktur folder, Supabase client, konfigurasi env), halaman placeholder dengan pengecekan koneksi Supabase, serta konfigurasi deployment Vercel.
- `database-schema`: Skema PostgreSQL/Supabase untuk seluruh entitas PRD Bagian 7, termasuk enum status, constraint, index, trigger, dan kebijakan RLS.
- `public-status-access`: Kontrak akses baca publik (tanpa login) terhadap status servis berdasarkan nomor polisi melalui RPC tersanitasi.

### Modified Capabilities

(tidak ada — belum ada spec sebelumnya)

## Impact

- **Dependencies baru:** `tailwindcss`, `@tailwindcss/vite`, `react-router`, `@supabase/supabase-js`.
- **Kode:** `vite.config.ts`, `src/` (restrukturisasi total dari template), `index.html` (judul & bahasa).
- **File baru:** `supabase/migrations/*.sql`, `.env.example`, `vercel.json`.
- **Sistem eksternal:** project Supabase milik pengguna (migrasi dijalankan di sana) dan project Vercel (env var diisi di dashboard).
- **Keputusan terkunci untuk iterasi berikutnya:** nama status (enum), relasi pelanggan–layanan, pola akses publik via RPC. Realtime untuk pelanggan publik (Iterasi 6) harus dirancang ulang di atas pola RPC ini karena `anon` tidak bisa SELECT tabel.
