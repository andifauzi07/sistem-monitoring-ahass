# service-history Specification

## Purpose
Halaman Riwayat yang menampilkan servis-servis yang sudah selesai diambil pelanggan (`Sudah Diambil`), lengkap dengan pencarian dan filter, sebagai arsip historis terpisah dari daftar servis aktif.

## Requirements
### Requirement: Daftar Riwayat Servis Selesai
Sistem SHALL menyediakan halaman Riwayat yang menampilkan hanya servis dengan status `Sudah Diambil`, diurutkan berdasarkan `tanggal_selesai` menurun (terbaru lebih dulu).

#### Scenario: Servis aktif tidak muncul di riwayat
- **WHEN** terdapat servis dengan status `Dikerjakan` dan servis lain dengan status `Sudah Diambil`
- **THEN** halaman Riwayat hanya menampilkan servis yang berstatus `Sudah Diambil`

#### Scenario: Riwayat kosong
- **WHEN** belum ada satu pun servis berstatus `Sudah Diambil`
- **THEN** halaman Riwayat menampilkan pesan bahwa belum ada riwayat, bukan error

### Requirement: Filter Riwayat per Rentang Tanggal
Halaman Riwayat SHALL menyediakan filter rentang tanggal yang diterapkan pada `tanggal_selesai`.

#### Scenario: Filter tanggal diterapkan
- **WHEN** pengguna memilih rentang tanggal dan terdapat servis `Sudah Diambil` dengan `tanggal_selesai` di luar rentang tersebut
- **THEN** servis tersebut tidak ditampilkan dalam hasil

### Requirement: Filter Riwayat per Nomor Polisi
Halaman Riwayat SHALL menyediakan pencarian berdasarkan nomor polisi, menggunakan normalisasi nomor polisi yang sama dengan fitur pencarian kendaraan lain di sistem.

#### Scenario: Pencarian nomor polisi tanpa spasi/kapitalisasi konsisten
- **WHEN** pengguna mengetik nomor polisi dengan huruf kecil dan spasi berbeda dari data tersimpan
- **THEN** sistem tetap menemukan servis yang nomor polisinya cocok setelah dinormalisasi
