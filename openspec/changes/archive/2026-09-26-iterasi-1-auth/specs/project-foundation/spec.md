## MODIFIED Requirements

### Requirement: Routing SPA dengan rute placeholder

Aplikasi SHALL menyediakan routing sisi klien dengan rute berikut:
- `/`: monitoring publik, placeholder;
- `/login`: form login Service Advisor, lihat capability `sa-authentication`;
- `/dashboard`: rute terproteksi, kontennya masih placeholder.

Rute yang tidak dikenal SHALL menampilkan halaman "tidak ditemukan".

#### Scenario: Navigasi ke rute yang dikenal

- **WHEN** pengguna membuka `/login`
- **THEN** halaman login ditampilkan tanpa reload penuh saat berpindah dari rute lain

#### Scenario: Rute terproteksi

- **WHEN** pengguna yang belum login membuka `/dashboard`
- **THEN** router mengarahkan ke `/login`, bukan menampilkan placeholder dashboard

#### Scenario: Rute tidak dikenal

- **WHEN** pengguna membuka `/tidak-ada`
- **THEN** halaman "tidak ditemukan" ditampilkan beserta tautan kembali ke `/`
