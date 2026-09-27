## 1. Modul error mekanik

- [x] 1.1 Buat `src/lib/mekanikErrors.ts`: tipe `KodeMekanikError` (`DATA_TIDAK_VALID`, `JARINGAN`, `UMUM`), tipe `PesanMekanik`, tipe `Hasil<T>`, dan fungsi `mapMekanikError(error)` — map kode Postgres `23514` (check constraint nama) ke "Nama mekanik tidak boleh kosong.", pola jaringan (`failed to fetch` dll.) ke `JARINGAN`, fallback ke `UMUM`. Ikuti struktur `src/lib/servisErrors.ts` tanpa reuse tipe dari sana.

## 2. Modul data mekanik

- [x] 2.1 Buat `src/lib/mekanik.ts`: fungsi `ambilDaftarMekanik()` — query `mekanik` dengan `.eq('is_active', true)` urut nama, dan `ambilServisAktif()` (dari `src/lib/servis.ts`) untuk hitung beban kerja per `mekanik_id` di JS; kembalikan array `{ id, nama, status_hadir, bebanKerja }`.
- [x] 2.2 Tambah fungsi `tambahMekanik(nama: string)` — trim + validasi non-empty di JS dulu, lalu `.insert({ nama })`.
- [x] 2.3 Tambah fungsi `ubahNamaMekanik(id: string, nama: string)` — trim + validasi non-empty, `.update({ nama }).eq('id', id)`.
- [x] 2.4 Tambah fungsi `ubahStatusHadir(id: string, statusHadir: boolean)` — `.update({ status_hadir: statusHadir }).eq('id', id)`.
- [x] 2.5 Tambah fungsi `nonaktifkanMekanik(id: string)` — `.update({ is_active: false }).eq('id', id)`.
- [x] 2.6 Semua fungsi di atas mengembalikan `Hasil<T>` dari `mekanikErrors.ts` dan memetakan error lewat `mapMekanikError`.

## 3. Halaman Manajemen Mekanik

- [x] 3.1 Buat `src/pages/MekanikPage.tsx`: muat daftar mekanik lewat `useMuat` + `ambilDaftarMekanik()`, tampilkan state loading/error mengikuti pola `ServisListPage.tsx`.
- [x] 3.2 Form tambah mekanik (input nama + tombol simpan) yang memanggil `tambahMekanik`, reset form dan muat ulang daftar setelah sukses, tampilkan pesan error dari `Hasil` bila gagal.
- [x] 3.3 Per baris mekanik: tombol/toggle ubah status hadir (panggil `ubahStatusHadir`, optimistic atau reload setelah sukses), aksi edit nama (mis. input inline atau dialog kecil, panggil `ubahNamaMekanik`), dan aksi nonaktifkan (pakai `ConfirmDialog` yang sudah ada, panggil `nonaktifkanMekanik`).
- [x] 3.4 Tampilkan kolom/angka beban kerja per mekanik dari `bebanKerja`.
- [x] 3.5 Tampilkan pesan kosong yang jelas bila belum ada mekanik aktif.
- [x] 3.6 Daftarkan rute `path: 'mekanik'` di `src/router.tsx` di dalam grup `RequireAuth`.
- [x] 3.7 Tambah `NavLink` "Mekanik" di `src/components/Layout.tsx`.

## 4. Modul data & halaman Kelola Akun

- [x] 4.1 Buat `src/lib/akun.ts`: fungsi `ubahNamaAkun(userId: string, nama: string)` — `.from('service_advisors').update({ nama }).eq('id', userId)`; fungsi `ubahEmailAkun(email: string)` — `supabase.auth.updateUser({ email })`; fungsi `ubahPasswordAkun(password: string)` — `supabase.auth.updateUser({ password })`. Map error lewat `mapAuthError` (untuk panggilan `auth.updateUser`) atau `mapMekanikError`-style generik untuk update tabel (boleh pakai `mapServisError`/pola serupa untuk pesan generik, atau map minimal langsung di modul ini — putuskan saat implementasi berdasarkan kebutuhan pesan).
- [x] 4.2 Buat `src/pages/AkunPage.tsx`: tampilkan nama & email akun yang sedang login (dari `useAuth()`/`service_advisors` row terkait `user.id`), form ubah nama, form ubah email, form ubah password (masing-masing dengan tombol simpan terpisah dan feedback sukses/error).
- [x] 4.3 Daftarkan rute `path: 'akun'` di `src/router.tsx` di dalam grup `RequireAuth`.
- [x] 4.4 Tambah `NavLink` "Akun" di `src/components/Layout.tsx`.

## 5. Verifikasi

- [x] 5.1 Jalankan `npm run build` dan pastikan lolos (type-check + build produksi).
- [x] 5.2 Jalankan `npm run lint` dan pastikan lolos.

## 6. Serah terima ke pengguna

- [x] 6.1 (Pengguna) Uji manual: tambah/edit/ubah status hadir/nonaktifkan mekanik di `/mekanik`, cek data & beban kerja (0) sesuai ekspektasi; ubah nama/email/password di `/akun` dan cek login ulang dengan kredensial baru.
- [x] 6.2 (Pengguna) Cek pengaturan Supabase Dashboard → Authentication → Settings terkait "Secure email change"/konfirmasi email, sesuaikan bila perubahan email masih meminta konfirmasi link padahal diinginkan langsung berubah.
- [x] 6.3 (Pengguna) Commit perubahan bila uji manual lolos.
