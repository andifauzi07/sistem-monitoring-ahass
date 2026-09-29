## MODIFIED Requirements

### Requirement: Routing SPA dengan rute placeholder

Aplikasi SHALL menyediakan routing sisi klien dengan rute berikut:
- `/`: monitoring publik pelanggan, lihat capability `public-monitoring`; menerima query param opsional `nopol`;
- `/login`: form login Service Advisor, lihat capability `sa-authentication`;
- `/dashboard`: rute terproteksi, lihat capability `sa-dashboard`.

Rute yang tidak dikenal SHALL menampilkan halaman "tidak ditemukan".

#### Scenario: Navigasi ke rute yang dikenal

- **WHEN** pengguna membuka `/login`
- **THEN** halaman login ditampilkan tanpa reload penuh saat berpindah dari rute lain

#### Scenario: Rute terproteksi

- **WHEN** pengguna yang belum login membuka `/dashboard`
- **THEN** router mengarahkan ke `/login`, bukan menampilkan dashboard

#### Scenario: Rute tidak dikenal

- **WHEN** pengguna membuka `/tidak-ada`
- **THEN** halaman "tidak ditemukan" ditampilkan beserta tautan kembali ke `/`

## REMOVED Requirements

### Requirement: Pengecekan koneksi Supabase

**Reason**: Indikator koneksi hanya dipakai sebagai uji asap di halaman placeholder Iterasi 0. Komponen `ConnectionStatus` sudah tidak dirender di mana pun, dan halaman publik kini memanggil `cek_status` secara nyata sehingga kegagalan koneksi terlihat sebagai pesan error pencarian.

**Migration**: Tidak ada. Kegagalan koneksi ke Supabase ditangani oleh state error di halaman publik (capability `public-monitoring`) dan di halaman-halaman Service Advisor. Konfigurasi env yang tidak lengkap tetap ditangani requirement "Supabase client tunggal dari environment".
