# public-status-access Specification

## Purpose
TBD - created by archiving change iterasi-0-setup. Update Purpose after archive.
## Requirements
### Requirement: RPC cek_status untuk publik
Database SHALL menyediakan fungsi `cek_status(nopol text)` bertipe `SECURITY DEFINER` yang dapat dieksekusi oleh role `anon` dan `authenticated`. Fungsi SHALL menormalisasi input dengan aturan yang sama seperti penyimpanan nomor polisi, lalu mengembalikan daftar layanan servis yang cocok.

#### Scenario: Nomor polisi ditemukan
- **WHEN** klien tanpa login memanggil `cek_status('dc 1234 ab')` dan kendaraan `DC1234AB` punya servis
- **THEN** fungsi mengembalikan baris servis kendaraan tersebut, diurutkan dari `tanggal_masuk` terbaru

#### Scenario: Nomor polisi tidak ditemukan
- **WHEN** klien memanggil `cek_status` dengan nomor polisi yang tidak terdaftar
- **THEN** fungsi mengembalikan hasil kosong tanpa error

### Requirement: Data publik tersanitasi
Hasil `cek_status` MUST hanya berisi `nomor_polisi`, `jenis_motor`, `status`, `tanggal_masuk`, dan `tanggal_selesai`. Hasil MUST NOT berisi `nama_pembawa`, `nomor_wa`, `masalah`, `kilometer`, maupun id internal.

#### Scenario: Kolom sensitif tidak terekspos
- **WHEN** hasil `cek_status` diperiksa
- **THEN** tidak ada kolom nama, nomor WA, keluhan, kilometer, atau id di dalamnya

### Requirement: Tidak ada enumerasi massal
`cek_status` MUST menolak input yang kosong atau lebih pendek dari 3 karakter setelah dinormalisasi, dan MUST hanya mencocokkan secara persis (bukan pencarian sebagian/wildcard).

#### Scenario: Input kosong
- **WHEN** `cek_status('')` dipanggil
- **THEN** fungsi mengembalikan hasil kosong

#### Scenario: Input wildcard
- **WHEN** `cek_status('%')` dipanggil
- **THEN** fungsi mengembalikan hasil kosong, bukan seluruh data

