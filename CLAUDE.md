# CLAUDE.md — Sistem Monitoring Layanan Kendaraan AHASS Kota Mamuju

## Ringkasan Proyek

Aplikasi web untuk memonitor status servis kendaraan di bengkel resmi AHASS Kota Mamuju secara real-time. Service Advisor mencatat & mengelola servis; pelanggan memantau status via nomor polisi tanpa login; notifikasi WhatsApp dikirim saat status berubah.

## Dokumen Rujukan Wajib

Spesifikasi fitur lengkap (FR-1 s.d. FR-7), skema database, ERD, use case diagram, flowchart, dan roadmap iterasi ada di **`docs/PRD.md`**.

> **Baca `docs/PRD.md` sebelum mengerjakan iterasi apa pun.** File ini (`CLAUDE.md`) sengaja dibuat ringkas dan hanya memuat aturan inti yang harus selalu dipatuhi di setiap sesi — bukan pengganti PRD lengkap.

## Tech Stack (Wajib Diikuti — Tidak Boleh Diganti Tanpa Persetujuan)

| Layer          | Teknologi                                                            |
| -------------- | -------------------------------------------------------------------- |
| Frontend       | ReactJS (SPA, component-based)                                       |
| Styling        | Tailwind CSS (utility-first)                                         |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Realtime Subscription, Storage)          |
| Deployment     | Vercel                                                               |
| Notifikasi     | WhatsApp (provider belum ditentukan — lihat `docs/PRD.md` Bagian 11) |

## Struktur Data Inti (ringkas — detail kolom lengkap di `docs/PRD.md` Bagian 7)

Tabel Supabase: `service_advisors`, `mekanik`, `pelanggan`, `layanan_service`, `riwayat_status`, `riwayat_penugasan_mekanik`.

## Roadmap Iterasi

Pengembangan dipecah menjadi iterasi 0–10 (lihat `docs/PRD.md` Bagian 13). Kerjakan sesuai urutan kecuali pengguna memutuskan lain. Setiap iterasi harus menghasilkan build yang berjalan (`npm run dev` / build sukses) sebelum lanjut ke iterasi berikutnya.

_(Update baris ini setiap kali sebuah iterasi selesai, agar sesi berikutnya tahu progres terakhir tanpa membaca ulang seluruh riwayat percakapan)_
**Iterasi terakhir yang selesai: — (belum dimulai)**

## Aturan Kerja (Guardrails) — WAJIB DIPATUHI

1. **Jangan mengganti stack teknologi** (ReactJS, Tailwind, Supabase, Vercel) tanpa persetujuan eksplisit pengguna.
2. **Jangan menambahkan fitur di luar scope** yang tercantum di `docs/PRD.md` Bagian 12 ("Out-of-Scope") tanpa diminta.
3. **Jangan mengunci nama-nama status servis** (state machine di `docs/PRD.md` Bagian 7.7) sebagai final tanpa konfirmasi pengguna.
4. **Jangan mengimplementasikan integrasi WhatsApp** dengan provider/kredensial tertentu tanpa persetujuan eksplisit pengguna (`docs/PRD.md` Bagian 11).
5. Ikuti urutan iterasi pada `docs/PRD.md` Bagian 13 kecuali pengguna meminta lompat/mengubah prioritas.
6. Setiap iterasi harus menghasilkan kode yang dapat dijalankan sebelum lanjut ke iterasi berikutnya.
7. Field data (nomor polisi, nama pembawa, nomor WA, jenis motor, kilometer, masalah, status) harus konsisten dengan ERD di `docs/PRD.md` Bagian 7.0 & 7.4 — jangan mengganti nama kolom secara sepihak.
8. **Desain UI/UX bebas ditentukan oleh AI agent** — jangan meminta persetujuan desain kecuali pengguna menanyakannya. Tetap gunakan Tailwind CSS sebagai basis styling.
9. **Jangan mengimplementasikan penugasan mekanik many-to-many** (satu kendaraan ditangani beberapa mekanik sekaligus) tanpa konfirmasi pengguna — default: satu mekanik per kendaraan.

## Build & Test Commands

- `npm run dev` — server pengembangan (butuh `.env` dari `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `npm run build` — type-check + build produksi (wajib lolos sebelum iterasi dianggap selesai)
- `npm run lint` — ESLint
- Belum ada test runner (`npm run test` belum tersedia).
- Migrasi DB: `supabase/migrations/*.sql`, dijalankan manual via Supabase SQL Editor (lihat `supabase/README.md`). Tipe TS di `src/types/database.ts` ditulis manual — **perbarui setiap kali skema berubah**.

## Keputusan yang Sudah Dikunci (Iterasi 0)

- **Status servis** = Postgres enum `status_servis`: `Menunggu Antrian` → `Diperiksa` → `Dikerjakan` → `Selesai Dikerjakan` → `Sudah Diambil` (dikonfirmasi pengguna).
- **Pelanggan = kendaraan**: `pelanggan.nomor_polisi` unik; `layanan_service` menyimpan snapshot `nama_pembawa`/`nomor_wa` per kunjungan; maksimal satu servis aktif (≠ `Sudah Diambil`) per kendaraan.
- **Nomor polisi** dinormalisasi di DB (`normalize_nopol`: huruf kapital, tanpa spasi/tanda baca); padanan TS di `src/lib/nopol.ts`.
- **Akses publik** hanya lewat RPC `cek_status(nopol)` (SECURITY DEFINER, kolom tersanitasi). Role `anon` tidak punya akses tabel → realtime publik (Iterasi 6) tidak bisa memakai `postgres_changes` langsung.
- `riwayat_status` diisi oleh trigger DB, bukan oleh kode frontend.
