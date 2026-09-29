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
**Iterasi terakhir yang selesai: Iterasi 5 — Halaman Publik Monitoring Pelanggan** (OpenSpec change `iterasi-5-monitoring-publik`, diarsipkan di `openspec/changes/archive/2026-09-29-iterasi-5-monitoring-publik`; FR-7.1–7.2 selesai — halaman `/` mencari servis via RPC `cek_status` (dibungkus `cekStatus()` + `pisahkanHasil()` di `src/lib/cekStatus.ts`, error hanya `JARINGAN`/`UMUM`), validasi klien min. 3 karakter setelah `normalizeNopol`, kartu servis aktif dengan komponen `StatusStepper` (5 tahap, vertikal di HP/horizontal mulai `sm`), riwayat `Sudah Diambil` maks. 5 dalam `<details>`, state tidak ditemukan/error+"Coba lagi". URL `/?nopol=<NOPOL>` adalah sumber kebenaran pencarian (push history, refresh/Back/tautan langsung jalan) — dipakai nanti di tautan WA (Iterasi 7). Pemuatan lewat `useMuat` sehingga Iterasi 6 bisa memanggil `muatUlang()`. `ConnectionStatus.tsx` dihapus. Tidak ada migrasi DB. Spec baru `public-monitoring` dan `project-foundation` sudah disinkronkan ke `openspec/specs/`. Uji manual dikonfirmasi lolos oleh pengguna. **Selanjutnya (next): Iterasi 6 — Realtime Update** (FR-3.4, FR-7.3, lihat `docs/PRD.md` Bagian 13; ingat role `anon` tidak bisa `postgres_changes` langsung).)

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

## Keputusan yang Sudah Dikunci (Iterasi 2)

- **SA satu-satunya yang mengubah status** (mekanik melapor lisan). Transisi hanya ±1 langkah menurut urutan enum, ditegakkan trigger DB `trg_aturan_layanan`; UI menyediakan tombol maju, "Batalkan" ±5 detik, dan mundur satu langkah di halaman detail. Langkah ke `Selesai Dikerjakan` dan `Sudah Diambil` wajib dikonfirmasi.
- **`tanggal_selesai`** diisi trigger saat `Dikerjakan → Selesai Dikerjakan` dan dikosongkan saat mundur; tidak bisa diisi manual.
- **`Sudah Diambil` final**: servis terkunci (tidak bisa diedit/diubah statusnya) dan baru setelah itu kendaraan boleh didaftarkan lagi.
- **Edit layanan** mengubah semua field data kecuali status (termasuk koreksi nopol) dan ikut memperbarui kontak di `pelanggan`. **Hapus** hanya saat `Menunggu Antrian` (FR-3.5).
- **Operasi multi-tabel lewat RPC** `SECURITY INVOKER` (`daftar_servis`, `ubah_servis`, `hapus_servis`); kegagalan dikembalikan sebagai kode error (mis. `SERVIS_AKTIF_ADA`) yang dipetakan ke pesan Bahasa Indonesia di `src/lib/servisErrors.ts`.
- Ubah status memakai update bersyarat (`.eq('status', statusSaatIni)`) agar aman dari dua tablet yang mengubah servis yang sama. Waktu di `riwayat_status` adalah waktu klik SA, bukan waktu kejadian di bengkel.
- UI dioptimalkan untuk **tablet** (target sentuh ≥ 44 px). Realtime tetap ditunda ke Iterasi 6.

## Keputusan yang Sudah Dikunci (Iterasi 4 & 4b — Manajemen & Penugasan Mekanik, Kelola Akun)

- **CRUD mekanik (FR-5.1–5.5) dan penugasan mekanik (FR-5.6–5.10) tanpa RPC baru.** Query langsung dari Supabase client + aturan bisnis ditegakkan trigger DB (pola sama seperti `ubahStatus`), bukan pola RPC `SECURITY INVOKER` seperti modul servis inti (`daftar_servis`/`ubah_servis`/`hapus_servis`).
- **Eligibilitas penugasan mekanik: harus `is_active = true` DAN `status_hadir = true`** (mengikuti flowchart PRD Bagian 10.4, bukan hanya `is_active` seperti disebut literal di teks FR-5.6) — ditegakkan di UI (dropdown hanya menampilkan yang memenuhi syarat) maupun trigger DB (defense-in-depth).
- **Satu mekanik per kendaraan** (bukan many-to-many) — kolom tunggal `layanan_service.mekanik_id`, penugasan lama tergantikan saat reassign.
- **`riwayat_penugasan_mekanik` diisi trigger DB**, bukan kode frontend — konsisten dengan `riwayat_status`.
- **Menonaktifkan mekanik yang masih menangani servis aktif ditolak** oleh trigger DB (kode `MEKANIK_MASIH_BERTUGAS`); SA harus reassign kendaraan tersebut ke mekanik lain dulu.
- **Status servis tidak dapat maju dari `Menunggu Antrian` ke `Diperiksa` tanpa mekanik ditugaskan** (permintaan tambahan pengguna, di luar FR-5.6–5.10 tertulis) — trigger DB `trg_cegah_maju_tanpa_mekanik`, ditegakkan sama di halaman Daftar Servis maupun Detail Servis lewat komponen `StatusActionButton` yang sama.
- **Update akun (FR-6.1): perubahan email lewat `supabase.auth.updateUser` tanpa alur verifikasi ulang** (auto-confirm, bukan flow konfirmasi email standar Supabase). Nama disimpan di `public.service_advisors.nama`; email/password adalah properti `auth.users`.
