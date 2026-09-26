## Context

Kondisi awal: scaffold `npm create vite` (React 19, TypeScript 6, Vite 8) tanpa Tailwind, tanpa Supabase, dan belum menjadi git repository. Pengguna sudah memiliki akun Supabase dan Vercel. Tech stack dikunci oleh `CLAUDE.md` (React, Tailwind, Supabase, Vercel).

Keputusan yang dikonfirmasi pengguna pada sesi eksplorasi:

- Nama status servis sesuai PRD 7.7, **disimpan sebagai Postgres enum**.
- **Pelanggan = kendaraan**: satu baris `pelanggan` per nomor polisi, banyak `layanan_service` per pelanggan.
- Akses publik halaman monitoring melalui **RPC `SECURITY DEFINER`**, bukan SELECT tabel oleh `anon`.

PRD 7.0 (ERD `LAYANAN_SERVICE ||--o{ PELANGGAN`) bertentangan dengan PRD 7.4 (`layanan_service.pelanggan_id`). Keputusan di atas mengikuti 7.4.

## Goals / Non-Goals

**Goals:**

- Fondasi frontend siap dipakai Iterasi 1+: Tailwind, router, Supabase client, struktur folder.
- Skema database final untuk seluruh tabel PRD Bagian 7, berikut constraint, trigger, dan RLS.
- Bukti koneksi Supabase dan deploy Vercel (DoD Iterasi 0).

**Non-Goals:**

- Login/logout dan proteksi rute (Iterasi 1). Rute `/dashboard` masih terbuka dan hanya placeholder.
- UI CRUD, dashboard, atau halaman monitoring fungsional (Iterasi 2–5).
- Realtime subscription (Iterasi 6) dan integrasi WhatsApp (Iterasi 7).
- Penugasan many-to-many mekanik (Guardrail #9); tetap satu `mekanik_id` per layanan.
- Aturan transisi status (mis. larangan mundur). Enum hanya membatasi nilai, bukan urutan.

## Decisions

### D1. Tailwind v4 via `@tailwindcss/vite`

Konfigurasi cukup lewat `@import "tailwindcss";` di `src/index.css` dan plugin di `vite.config.ts`, tanpa `tailwind.config.js` maupun PostCSS. Token warna tema didefinisikan di blok `@theme`.
_Alternatif:_ Tailwind v3 + PostCSS. Ditolak karena lebih banyak konfigurasi tanpa manfaat untuk proyek baru.

### D2. `react-router` (v7, library mode) dengan `createBrowserRouter`

Router didefinisikan di `src/router.tsx`, dengan satu layout root yang memuat `<Outlet/>`. Pola ini memudahkan penambahan guard auth di Iterasi 1.
_Alternatif:_ TanStack Router. Ditolak karena overhead lebih besar dan kurang dikenal untuk skripsi/tugas akhir.

### D3. Struktur folder berbasis fitur

```
src/
  lib/          supabase.ts, nopol.ts (normalisasi, dipakai ulang di UI)
  components/   komponen UI generik (Layout, ConnectionStatus)
  pages/        PublicMonitoringPage, LoginPage, DashboardPage, NotFoundPage
  types/        database.ts (tipe baris tabel & enum)
  router.tsx, main.tsx, index.css
supabase/
  migrations/   0001_init_schema.sql
```

Folder `features/` baru dibuat ketika modul pertama (Iterasi 2) membutuhkannya, supaya tidak ada folder kosong.

### D4. Tipe TypeScript ditulis manual di `src/types/database.ts`

_Alternatif:_ `supabase gen types`. Membutuhkan Supabase CLI dan login, sehingga ditunda. Tipe manual mudah diganti hasil generate nanti karena bentuknya sama (`Database['public']['Tables'][...]`).

### D5. Status sebagai Postgres ENUM `status_servis`

Sesuai keputusan pengguna. `riwayat_status.status_baru` juga memakai enum ini (PRD menulis `text`). Nama kolom tetap sama, hanya tipenya diperketat agar log tidak bisa berisi nilai liar.
_Trade-off:_ nilai enum bisa ditambah (`ADD VALUE`) dan diganti nama (`RENAME VALUE`), tetapi tidak bisa dihapus tanpa membuat ulang tipenya.

### D6. Model pelanggan & denormalisasi terkontrol

- `pelanggan(nomor_polisi UNIQUE, nama_pembawa, nomor_wa)` menyimpan data kendaraan beserta kontak terakhir yang diketahui.
- `layanan_service` tetap memiliki `nomor_polisi`, `nama_pembawa`, dan `nomor_wa` (PRD 7.4 / Guardrail #7) sebagai **snapshot per kunjungan**, karena pembawa dan nomor WA bisa berbeda setiap servis. Notifikasi WA memakai snapshot ini.
- Konsistensi `layanan_service.nomor_polisi` dengan `pelanggan.nomor_polisi` menjadi tanggung jawab alur tambah servis (Iterasi 2), yaitu upsert pelanggan lalu insert layanan. Pada Iterasi 0 tidak ada trigger silang untuk hal ini, agar logika tetap sederhana.

### D7. Normalisasi nomor polisi di database

Fungsi SQL `normalize_nopol(text)` menjalankan `upper(regexp_replace(x, '[^A-Za-z0-9]', '', 'g'))`. Fungsi ini dipakai oleh trigger `BEFORE INSERT OR UPDATE` pada `pelanggan` dan `layanan_service`, serta oleh `cek_status`. Padanan TypeScript ada di `src/lib/nopol.ts` untuk tampilan dan validasi di UI, tetapi sumber kebenarannya tetap database.

### D8. Satu servis aktif per kendaraan

Partial unique index: `CREATE UNIQUE INDEX ... ON layanan_service(pelanggan_id) WHERE status <> 'Sudah Diambil'`.

### D9. Trigger

| Trigger                | Tabel                                                                            | Fungsi                                                                 |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `on_auth_user_created` | `auth.users` AFTER INSERT                                                        | insert ke `service_advisors` (SECURITY DEFINER, `search_path` dikunci) |
| `trg_normalize_nopol`  | `pelanggan`, `layanan_service` BEFORE INSERT/UPDATE                              | normalisasi `nomor_polisi`                                             |
| `trg_log_status`       | `layanan_service` AFTER INSERT, AFTER UPDATE OF status (bila `IS DISTINCT FROM`) | insert `riwayat_status`                                                |
| `trg_set_updated_at`   | `layanan_service` BEFORE UPDATE                                                  | `updated_at = now()`                                                   |

`riwayat_status.diubah_oleh` bersifat **nullable**, karena perubahan dari SQL Editor atau service role tidak memiliki `auth.uid()`.

### D10. RLS

- Semua tabel publik: `ENABLE ROW LEVEL SECURITY`.
- Policy `authenticated`: `FOR ALL USING (true) WITH CHECK (true)`. Semua Service Advisor setara karena MVP tidak memiliki peran admin (PRD 4).
- Tidak ada policy untuk `anon`, sehingga akses tabel otomatis ditolak.
- `cek_status` dibuat `SECURITY DEFINER` + `SET search_path = public`, `REVOKE ALL ... FROM public`, lalu `GRANT EXECUTE ... TO anon, authenticated`.

### D11. Test query koneksi

Komponen `ConnectionStatus` memanggil `supabase.rpc('cek_status', { nopol: '___' })`. RPC bisa dijalankan oleh `anon` dan mengembalikan hasil kosong, sehingga query sungguhan ini membuktikan (a) URL/key valid dan (b) migrasi sudah terpasang, tanpa perlu login.
_Alternatif:_ `select` dari tabel. Hasilnya selalu kosong untuk `anon` karena RLS, jadi tidak bisa membedakan antara "belum ada migrasi" dan "berhasil".

### D12. Menjalankan migrasi

File SQL dijalankan melalui **Supabase SQL Editor** (tanpa perlu CLI). File tetap disimpan di `supabase/migrations/` agar kompatibel bila nanti beralih ke `supabase db push`. Migrasi ditulis idempoten sejauh wajar (`create ... if not exists`, `drop trigger if exists`).

### D13. Vercel

`vercel.json` berisi rewrite `/(.*) → /index.html`. Env `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` diisi di dashboard Vercel. Deploy dilakukan dengan menghubungkan repo GitHub ke Vercel; proyek terlebih dulu di-`git init`.

## Risks / Trade-offs

- [Pola RPC menghambat Realtime publik di Iterasi 6: `anon` tidak bisa subscribe `postgres_changes` pada tabel ber-RLS] → Mitigasi: di Iterasi 6 gunakan Supabase Broadcast dari trigger (`realtime.send`) ke channel per nopol, atau polling ringan. Diputuskan saat Iterasi 6.
- [Semua Service Advisor punya akses penuh] → Diterima untuk MVP satu cabang; dapat dipersempit bila muncul peran admin.
- [Tipe TS manual bisa tidak sinkron dengan skema] → Tipe dibatasi hanya untuk tabel Bagian 7; ganti ke `supabase gen types` bila skema mulai sering berubah.
- [`anon key` terekspos di bundle frontend] → Memang dirancang publik oleh Supabase; keamanan bergantung pada RLS dan fungsi yang terbatas (D10).
- [Nopol diganti nama di `pelanggan` tidak mengalir ke snapshot `layanan_service`] → Diterima; snapshot memang merekam kondisi saat kunjungan.

## Migration Plan

1. Jalankan `supabase/migrations/0001_init_schema.sql` di SQL Editor project Supabase pengguna.
2. Isi `.env` lokal, lalu jalankan `npm run dev` dan pastikan indikator menampilkan "Terhubung".
3. Buat satu user Service Advisor di Supabase Auth, lalu cek bahwa baris `service_advisors` terbentuk.
4. `git init`, commit, push ke GitHub, import ke Vercel, isi env, deploy.

Rollback: karena project Supabase masih kosong, cukup `drop schema public cascade; create schema public;` (ditambah grant default) lalu ulangi langkah 1.

## Open Questions

- Label kolom "Nama Pegawai" di dashboard (PRD 8.2): apakah maksudnya mekanik yang ditugaskan? Tidak memengaruhi skema; diputuskan di Iterasi 3.
- Mekanisme realtime publik (lihat Risks), diputuskan di Iterasi 6.
