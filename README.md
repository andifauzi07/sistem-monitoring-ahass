# Sistem Monitoring Layanan Kendaraan — AHASS Kota Mamuju

Aplikasi web untuk memantau status servis kendaraan secara real-time. Service Advisor mengelola data servis, sedangkan pelanggan cukup memasukkan nomor polisi (tanpa login) untuk melihat progres. Spesifikasi lengkap ada di [`docs/PRD.md`](docs/PRD.md).

**Stack:** React + TypeScript (Vite) · Tailwind CSS v4 · Supabase (PostgreSQL, Auth, Realtime) · Vercel

## Setup lokal

Prasyarat: Node.js 20+ dan sebuah project Supabase.

```bash
npm install
cp .env.example .env       # isi VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev                # http://localhost:5173
```

Jalankan migrasi database sesuai [`supabase/README.md`](supabase/README.md). Indikator di footer akan menampilkan **"Terhubung ke database"** bila URL/key valid dan migrasi sudah terpasang.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan dengan HMR |
| `npm run build` | Type-check (`tsc -b`) + build produksi ke `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Menyajikan hasil build secara lokal |

## Struktur

```
src/
  components/   komponen UI bersama (Layout, ConnectionStatus)
  lib/          supabase client, utilitas nomor polisi
  pages/        halaman per rute
  types/        tipe database (mengikuti migrasi SQL)
  router.tsx    definisi rute
supabase/
  migrations/   skema database (SQL terversi)
openspec/       proposal & spesifikasi perubahan per iterasi
```

## Deployment (Vercel)

1. Push repo ke GitHub, lalu **Import Project** di Vercel (preset Vite terdeteksi otomatis).
2. Isi Environment Variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy. `vercel.json` mengarahkan semua rute ke `index.html` agar deep link seperti `/dashboard` berfungsi.
