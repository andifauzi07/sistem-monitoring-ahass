# sa-account Specification

## Purpose
Halaman Kelola Akun bagi Service Advisor yang sedang login: melihat data akunnya sendiri serta mengubah nama, email, dan password akun tersebut.

## Requirements
### Requirement: Lihat Data Akun
Service Advisor yang sedang login SHALL dapat melihat nama dan email akunnya sendiri pada halaman Kelola Akun.

#### Scenario: Menampilkan data akun yang sedang login
- **WHEN** Service Advisor dengan nama "Siti Aminah" dan email "siti@ahass.example" membuka halaman Kelola Akun
- **THEN** halaman menampilkan nama "Siti Aminah" dan email "siti@ahass.example"

### Requirement: Ubah Nama Akun
Service Advisor SHALL dapat mengubah nama akunnya sendiri. Perubahan SHALL hanya berlaku pada baris `service_advisors` milik Service Advisor yang sedang login.

#### Scenario: Ubah nama berhasil
- **WHEN** Service Advisor mengubah nama dari "Siti Aminah" menjadi "Siti A." dan menyimpan
- **THEN** kolom `nama` pada baris `service_advisors` miliknya diperbarui menjadi "Siti A."

### Requirement: Ubah Email Akun
Service Advisor SHALL dapat mengubah alamat email akunnya sendiri. Perubahan email SHALL diterapkan langsung tanpa alur konfirmasi tambahan yang dibangun oleh aplikasi.

#### Scenario: Ubah email berhasil
- **WHEN** Service Advisor mengubah email dari "siti@ahass.example" menjadi "siti.baru@ahass.example" dan menyimpan
- **THEN** email akun diperbarui menjadi "siti.baru@ahass.example" tanpa aplikasi menampilkan langkah verifikasi tambahan

### Requirement: Ubah Password Akun
Service Advisor SHALL dapat mengubah password akunnya sendiri selama masih dalam sesi login aktif, tanpa perlu memasukkan ulang password lama.

#### Scenario: Ubah password berhasil
- **WHEN** Service Advisor yang sedang login mengisi password baru yang valid dan menyimpan
- **THEN** password akun diperbarui dan Service Advisor tetap dalam sesi login yang sama

#### Scenario: Password baru terlalu pendek ditolak
- **WHEN** Service Advisor mengisi password baru kurang dari panjang minimum yang disyaratkan Supabase Auth
- **THEN** sistem menampilkan pesan kesalahan dan password tidak berubah
