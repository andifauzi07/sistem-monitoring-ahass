## Context

Iterasi 0 sudah membuat tabel `mekanik` (`nama`, `status_hadir`, `is_active`) dan RLS `authenticated akses penuh` untuk semua tabel inti, tapi belum ada kode frontend yang menyentuhnya. Iterasi 2 menetapkan pola RPC `SECURITY INVOKER` untuk operasi `layanan_service` karena operasinya multi-tabel (servis + pelanggan) dan butuh aturan transisi status yang ditegakkan di DB. CRUD mekanik tidak punya kebutuhan itu — satu tabel, tanpa state machine, tanpa entitas terkait yang perlu disinkronkan.

`service_advisors` juga sudah ada sejak Iterasi 0 (diisi otomatis oleh trigger `handle_new_user` saat sign up), tapi belum ada halaman untuk SA melihat/mengubah datanya sendiri.

## Goals / Non-Goals

**Goals:**
- Service Advisor bisa mengelola data mekanik (tambah, edit nama, ubah status hadir, nonaktifkan) dan melihat daftar mekanik aktif beserta beban kerja saat ini.
- Service Advisor bisa melihat dan mengubah nama, email, password akunnya sendiri.
- Konsisten dengan pola kode yang sudah ada (`Hasil<T>`, komponen form, `useMuat`, dsb.) supaya iterasi berikutnya mudah mengikuti.

**Non-Goals:**
- Penugasan mekanik ke `layanan_service` (FR-5.6–5.10) — itu Iterasi 4b, butuh tabel `riwayat_penugasan_mekanik` yang sudah ada tapi belum dipakai.
- Memperbaiki kolom "Mekanik" di Dashboard yang saat ini menampilkan `mekanik_id` mentah — ditunda ke Iterasi 4b karena baru berguna setelah ada data penugasan.
- Mengelola akun SA lain (admin mengelola user lain) — FR-6.1 hanya untuk akun sendiri.
- Menghapus mekanik secara permanen — hanya soft delete (`is_active = false`).

## Decisions

### D1: CRUD mekanik lewat query Supabase langsung, bukan RPC
Tabel `mekanik` sudah punya RLS `authenticated akses penuh` dan operasinya selalu single-table (insert satu baris, atau update satu/lebih kolom pada satu baris). Tidak ada invariant lintas tabel yang perlu dijaga di level DB seperti pada `layanan_service` (satu servis aktif per kendaraan, transisi status ±1 langkah). Maka `src/lib/mekanik.ts` memanggil `supabase.from('mekanik').insert/update/select` langsung, mengikuti pola `src/lib/dashboard.ts` dan `src/lib/riwayat.ts` (query baca) — bukan pola RPC dari `src/lib/servis.ts`.

**Alternatif yang dipertimbangkan:** RPC `SECURITY INVOKER` seperti modul servis, untuk konsistensi pola. Ditolak karena menambah lapisan tanpa manfaat (tidak ada logic yang perlu dijaga atomicity-nya), dan disepakati pengguna di sesi eksplorasi.

### D2: Validasi nama mekanik — cek di form + fallback error DB
DB sudah punya `check (length(trim(nama)) > 0)` pada kolom `mekanik.nama`. Form (`MekanikForm` atau inline di `MekanikPage.tsx`) melakukan trim + cek non-empty sebelum submit (mencegah round-trip yang tidak perlu), dan `src/lib/mekanikErrors.ts` memetakan pelanggaran check constraint (kode Postgres `23514`) menjadi pesan "Nama mekanik tidak boleh kosong." sebagai fallback pertahanan kedua.

### D3: Modul error terpisah `src/lib/mekanikErrors.ts`
Mengikuti konvensi satu modul error per domain (`servisErrors.ts` untuk servis, `authErrors.ts` untuk auth). Dibuat `PesanMekanik`/`Hasil<T>` sendiri (bukan reuse tipe dari `servisErrors.ts`) supaya domain mekanik tidak bergantung pada domain servis, dan kode error (`KodeMekanikError`) relevan untuk mekanik saja (mis. `DATA_TIDAK_VALID`, `JARINGAN`, `UMUM`).

### D4: Beban kerja mekanik dihitung di client dari data yang sudah ada
Halaman Daftar Mekanik mengambil seluruh `layanan_service` dengan status ≠ `Sudah Diambil` (fungsi `ambilServisAktif` yang sudah ada di `src/lib/servis.ts`, dipakai ulang seperti di Dashboard), lalu menghitung jumlah per `mekanik_id` di JavaScript untuk ditampilkan sebagai "beban kerja" per mekanik. Tidak perlu RPC agregasi baru untuk skala data bengkel ini. **Konsekuensi yang sudah disepakati:** karena `mekanik_id` belum pernah diisi sebelum Iterasi 4b, kartu beban kerja akan menampilkan 0 untuk semua mekanik sampai Iterasi 4b selesai.

### D5: Update akun (FR-6.1) — nama vs email/password
- **Nama**: update langsung ke `service_advisors.nama` lewat `supabase.from('service_advisors').update({ nama }).eq('id', user.id)`. Filter `.eq('id', user.id)` wajib di query karena RLS tidak membatasi ke baris sendiri (`authenticated akses penuh`, keputusan Iterasi 0) — jadi keamanan "hanya bisa edit akun sendiri" ditegakkan di kode aplikasi, bukan RLS.
- **Email & password**: `supabase.auth.updateUser({ email })` / `{ password }`. Sesuai keputusan pengguna, tidak dibangun alur konfirmasi email tambahan di aplikasi — email langsung berubah begitu API sukses.

### D6: Rute & navigasi baru
Tambah `{ path: 'mekanik', element: <MekanikPage /> }` dan `{ path: 'akun', element: <AkunPage /> }` di `src/router.tsx` di bawah `RequireAuth` (baris komentar "Rute Service Advisor pada iterasi berikutnya ditambahkan sebagai child di sini" di `router.tsx:25`), dan tautan baru di `src/components/Layout.tsx`.

## Risks / Trade-offs

- **[Risk] Setting Supabase Auth "Confirm email change" mungkin masih aktif di project** → project mungkin tetap mengirim email konfirmasi ke alamat lama/baru meskipun kode aplikasi tidak membangun alur itu, karena ini kontrol di level project Supabase Auth, bukan sesuatu yang bisa dimatikan lewat kode/migrasi SQL. **Mitigasi:** dicatat sebagai langkah manual di `tasks.md` — pengguna perlu mengecek/menonaktifkan "Secure email change"/"Confirm email change" di Supabase Dashboard → Authentication → Settings kalau ingin email berubah instan tanpa link konfirmasi.
- **[Risk] RLS `authenticated akses penuh` berarti secara teknis satu SA bisa mengubah data akun SA lain lewat API langsung** (bukan cuma mekanik) → ini adalah keputusan yang sudah dikunci sejak Iterasi 0 (bukan regresi baru), dan di luar scope untuk diperketat sekarang. Dicatat ulang di sini supaya tidak dikira celah baru dari iterasi ini.
- **[Risk] Data mekanik dummy/testing bisa menumpuk** karena tidak ada hard delete → sudah sesuai desain PRD (soft delete demi riwayat penugasan), tidak perlu mitigasi tambahan.

## Migration Plan

Tidak ada migrasi DB baru. Tidak ada rollback khusus di luar revert kode (tidak ada perubahan skema).

## Open Questions

- Tidak ada — keputusan desain di atas sudah dikonfirmasi pengguna di sesi eksplorasi sebelum proposal ini dibuat.
