# Database (Supabase)

Skema database disimpan sebagai migrasi SQL terversi di `migrations/`. Semua file aman dijalankan ulang (idempoten).

## Menjalankan migrasi

1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Salin seluruh isi `migrations/0001_init_schema.sql`, tempel, lalu klik **Run**.
3. Pastikan tidak ada error. Pesan `NOTICE ... skipping` adalah hal normal.

Alternatif bila memakai Supabase CLI: `supabase link --project-ref <ref>` lalu `supabase db push`.

## Membuat akun Service Advisor

Aplikasi tidak memiliki halaman registrasi. Buat akun lewat **Authentication → Users → Add user → Create new user** (centang *Auto Confirm User*).
Trigger `on_auth_user_created` otomatis membuat baris di `service_advisors`. Untuk mengisi nama, tambahkan user metadata `{"nama": "Nama Lengkap"}`; jika kosong, nama diambil dari bagian depan email.

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
| `cek_status(nopol)` | RPC publik (anon). Hanya mengembalikan nopol, jenis motor, status, dan tanggal |
| RLS | `authenticated` = akses penuh; `anon` = tanpa akses tabel |
