# Database (Supabase)

Skema database disimpan sebagai migrasi SQL terversi di `migrations/`. Semua file aman dijalankan ulang (idempoten).

## Menjalankan migrasi

1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Salin seluruh isi `migrations/0001_init_schema.sql`, tempel, lalu klik **Run**.
3. Pastikan tidak ada error. Pesan `NOTICE ... skipping` adalah hal normal.

Alternatif bila memakai Supabase CLI: `supabase link --project-ref <ref>` lalu `supabase db push`.

## Migrasi Iterasi 2 (Kelola Service)

Jalankan **setelah** `0001_init_schema.sql`, dengan cara yang sama di SQL Editor: salin isi `migrations/0002_kelola_service.sql`, tempel, lalu **Run**. Jalankan sebelum aplikasi Iterasi 2 dipakai, karena aplikasi memanggil RPC `daftar_servis`, `ubah_servis`, dan `hapus_servis`.

Migrasi ini hanya menambah trigger dan fungsi (tidak mengubah kolom atau data). Untuk membatalkannya:

```sql
drop trigger if exists trg_aturan_layanan on public.layanan_service;
drop trigger if exists trg_cegah_hapus_layanan on public.layanan_service;
drop function if exists public.aturan_layanan_service();
drop function if exists public.cegah_hapus_layanan();
drop function if exists public.daftar_servis(text, text, text, text, integer, text);
drop function if exists public.ubah_servis(uuid, text, text, text, text, integer, text);
drop function if exists public.hapus_servis(uuid);
drop function if exists public.bersihkan_input_servis(text, text, text, text, integer, text);
```

Query verifikasi (jalankan di SQL Editor; gunakan data uji lalu hapus). Editor berjalan sebagai role `postgres`, jadi `auth.uid()` bernilai null: untuk uji RPC yang butuh login, gunakan aplikasi.

```sql
-- 1. Trigger terpasang (harus 2 baris)
select tgname from pg_trigger
where tgrelid = 'public.layanan_service'::regclass
  and tgname in ('trg_aturan_layanan', 'trg_cegah_hapus_layanan');

-- 2. RPC ada (harus 3 baris)
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('daftar_servis', 'ubah_servis', 'hapus_servis');

-- 3. anon tidak boleh mengeksekusi RPC (semua harus false)
select has_function_privilege('anon', 'public.daftar_servis(text,text,text,text,integer,text)', 'execute'),
       has_function_privilege('anon', 'public.ubah_servis(uuid,text,text,text,text,integer,text)', 'execute'),
       has_function_privilege('anon', 'public.hapus_servis(uuid)', 'execute');

-- 4. Validasi input (harus ERROR: DATA_TIDAK_VALID, detail nomor_wa)
select * from public.bersihkan_input_servis('DC1234AB', 'Budi', 'abc', 'Vario', 1000, 'Rem bunyi');

-- 5. Input valid dibersihkan (nopol 'DC1234AB', wa '081234567890')
select * from public.bersihkan_input_servis('dc 1234-ab', ' Budi ', '0812 3456-7890', 'Vario', 1000, 'Rem bunyi');
```

Aturan status (transisi ±1 langkah, `tanggal_selesai`, kunci `Sudah Diambil`, hapus terbatas) paling mudah diuji lewat aplikasi mengikuti daftar uji manual pada `tasks.md` change `iterasi-2-kelola-service`.
## Membuat akun Service Advisor

Aplikasi tidak memiliki halaman registrasi. Buat akun lewat **Authentication → Users → Add user → Create new user** (centang *Auto Confirm User*).
Trigger `on_auth_user_created` otomatis membuat baris di `service_advisors`. Untuk mengisi nama, tambahkan user metadata `{"nama": "Nama Lengkap"}`; jika kosong, nama diambil dari bagian depan email.

## Kebijakan akun & keamanan Auth

Trigger `on_auth_user_created` menjadikan setiap user di `auth.users` sebagai Service Advisor dengan akses penuh (RLS `authenticated`), dan publishable key ada di bundle JavaScript publik. Karena itu sign-up publik **harus dimatikan**:

1. Buka **Supabase Dashboard → Authentication → Sign In / Providers**.
2. Matikan **Allow new users to sign up**.
3. Matikan **Allow anonymous sign-ins**.
4. Klik **Save**.

Fitur **Authentication → Users → Add user** tetap berfungsi walaupun sign-up publik mati, jadi akun Service Advisor tetap bisa dibuat oleh admin.

Verifikasi bahwa sign-up ditolak (harus mengembalikan error seperti `signup_disabled`, dan tidak ada user baru di `auth.users`):

```bash
curl -X POST "$VITE_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"uji-signup@example.com","password":"password-uji-123"}'
```

## Query verifikasi

Jalankan di SQL Editor setelah migrasi:

```sql
-- 1. Enum status (harus 5 nilai berurutan)
select unnest(enum_range(null::status_servis));

-- 2. Nilai status tidak valid ditolak (harus ERROR: invalid input value for enum)
select 'Selesai'::status_servis;

-- 3. Normalisasi nomor polisi (harus 'DC1234AB')
select normalize_nopol('dc 1234-ab');

-- 4. RLS aktif di semua tabel (kolom rowsecurity harus true)
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;

-- 5. Akun Service Advisor tersinkron dengan auth.users (jumlah harus sama)
select (select count(*) from auth.users) as auth_users,
       (select count(*) from service_advisors) as service_advisors;

-- 6. RPC publik bekerja dan input pendek/wildcard ditolak (semua harus 0 baris)
select * from cek_status('%');
select * from cek_status('');
```

Untuk memastikan role `anon` tidak bisa membaca tabel, uji dari aplikasi (tanpa login) atau via REST:

```bash
curl "$VITE_SUPABASE_URL/rest/v1/layanan_service?select=*" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
# → error "permission denied for table layanan_service"
```

## Ringkasan objek

| Objek | Keterangan |
|---|---|
| `status_servis` (enum) | `Menunggu Antrian` → `Diperiksa` → `Dikerjakan` → `Selesai Dikerjakan` → `Sudah Diambil` |
| `pelanggan` | Satu baris per kendaraan (`nomor_polisi` unik) |
| `layanan_service` | Satu baris per kunjungan servis. Maksimal satu servis aktif (≠ `Sudah Diambil`) per kendaraan |
| `riwayat_status` | Diisi otomatis oleh trigger saat insert dan saat status berubah |
| `riwayat_penugasan_mekanik` | Log penugasan mekanik (diisi mulai Iterasi 4b) |
| `trg_aturan_layanan` | Trigger: servis baru selalu `Menunggu Antrian`; status hanya ±1 langkah; `tanggal_selesai` otomatis saat `Selesai Dikerjakan`; `Sudah Diambil` terkunci |
| `trg_cegah_hapus_layanan` | Trigger: hapus layanan hanya saat `Menunggu Antrian` |
| `daftar_servis(...)` / `ubah_servis(...)` / `hapus_servis(id)` | RPC untuk `authenticated` (Iterasi 2). Atomik: pelanggan dan layanan diubah dalam satu transaksi |
| `cek_status(nopol)` | RPC publik (anon). Hanya mengembalikan nopol, jenis motor, status, dan tanggal |
| RLS | `authenticated` = akses penuh; `anon` = tanpa akses tabel |
