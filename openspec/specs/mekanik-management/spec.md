# mekanik-management Specification

## Purpose
Manajemen data mekanik oleh Service Advisor: menambah mekanik baru, mengubah nama, mengubah status hadir, menonaktifkan mekanik (soft delete), serta melihat daftar mekanik aktif beserta beban kerjanya.

## Requirements
### Requirement: Tambah Mekanik
Service Advisor SHALL dapat menambahkan mekanik baru dengan mengisi nama. Status hadir mekanik baru SHALL default `false` dan `is_active` SHALL default `true`.

#### Scenario: Tambah mekanik dengan nama valid
- **WHEN** Service Advisor mengisi nama "Budi Santoso" dan menekan simpan
- **THEN** baris baru tersimpan di tabel `mekanik` dengan `nama = "Budi Santoso"`, `status_hadir = false`, `is_active = true`, dan muncul di daftar mekanik

#### Scenario: Nama kosong ditolak
- **WHEN** Service Advisor mencoba menyimpan mekanik dengan nama kosong atau hanya spasi
- **THEN** sistem menampilkan pesan "Nama mekanik tidak boleh kosong." dan tidak menyimpan data

### Requirement: Edit Nama Mekanik
Service Advisor SHALL dapat mengubah nama mekanik yang sudah terdaftar, termasuk mekanik yang sedang tidak aktif.

#### Scenario: Ubah nama mekanik
- **WHEN** Service Advisor mengubah nama mekanik dari "Budi Santoso" menjadi "Budi S." dan menyimpan
- **THEN** kolom `nama` pada baris mekanik tersebut diperbarui menjadi "Budi S."

### Requirement: Ubah Status Hadir
Service Advisor SHALL dapat mengubah status hadir (hadir/tidak hadir) mekanik aktif kapan saja, dan perubahan ini SHALL langsung tercermin di kartu "Mekanik yang Hadir" pada Dashboard.

#### Scenario: Tandai mekanik hadir
- **WHEN** Service Advisor mengubah status hadir mekanik "Budi Santoso" dari tidak hadir menjadi hadir
- **THEN** `mekanik.status_hadir` untuk baris tersebut menjadi `true`

#### Scenario: Tandai mekanik tidak hadir
- **WHEN** Service Advisor mengubah status hadir mekanik yang sebelumnya hadir menjadi tidak hadir
- **THEN** `mekanik.status_hadir` untuk baris tersebut menjadi `false`

### Requirement: Nonaktifkan Mekanik
Service Advisor SHALL dapat menonaktifkan mekanik (soft delete via `is_active = false`) tanpa menghapus baris atau riwayat penugasan terkait. Mekanik nonaktif SHALL tidak muncul di daftar mekanik aktif maupun pilihan penugasan.

#### Scenario: Nonaktifkan mekanik
- **WHEN** Service Advisor menonaktifkan mekanik "Budi Santoso"
- **THEN** `mekanik.is_active` untuk baris tersebut menjadi `false`, baris tidak dihapus, dan mekanik tersebut tidak lagi muncul di daftar mekanik aktif

#### Scenario: Mekanik nonaktif tidak bisa dinonaktifkan ulang tanpa efek
- **WHEN** Service Advisor melihat daftar mekanik aktif setelah menonaktifkan seorang mekanik
- **THEN** mekanik yang dinonaktifkan tidak tampil di daftar tersebut

### Requirement: Daftar Mekanik dan Beban Kerja
Sistem SHALL menampilkan daftar seluruh mekanik dengan `is_active = true`, beserta status hadir masing-masing dan jumlah kendaraan yang sedang ditanganinya (baris `layanan_service` dengan `mekanik_id` mekanik tersebut dan status ≠ `Sudah Diambil`).

#### Scenario: Mekanik belum menangani kendaraan apa pun
- **WHEN** seorang mekanik aktif belum pernah ditugaskan ke `layanan_service` mana pun (`mekanik_id` pada semua servis aktif tidak merujuk ke mekanik ini)
- **THEN** beban kerja mekanik tersebut ditampilkan sebagai 0

#### Scenario: Mekanik sedang menangani beberapa kendaraan
- **WHEN** terdapat 3 baris `layanan_service` berstatus selain `Sudah Diambil` dengan `mekanik_id` yang sama menunjuk ke satu mekanik
- **THEN** beban kerja mekanik tersebut ditampilkan sebagai 3

#### Scenario: Daftar hanya menampilkan mekanik aktif
- **WHEN** terdapat mekanik dengan `is_active = false`
- **THEN** mekanik tersebut tidak muncul pada daftar mekanik

### Requirement: Tugaskan Mekanik ke Kendaraan
Service Advisor SHALL dapat menugaskan satu mekanik ke sebuah `layanan_service` yang berstatus selain `Selesai Dikerjakan` atau `Sudah Diambil`. Hanya mekanik dengan `is_active = true` dan `status_hadir = true` yang dapat dipilih.

#### Scenario: Tugaskan mekanik ke servis yang belum punya mekanik
- **WHEN** Service Advisor memilih mekanik "Budi Santoso" (aktif dan hadir) untuk servis berstatus `Diperiksa` yang `mekanik_id`-nya masih `null`
- **THEN** `layanan_service.mekanik_id` untuk servis tersebut berubah menjadi id "Budi Santoso"

#### Scenario: Mekanik tidak hadir tidak dapat dipilih
- **WHEN** Service Advisor mencoba menugaskan mekanik yang `is_active = true` tapi `status_hadir = false`
- **THEN** sistem menolak dengan pesan bahwa mekanik tersebut sedang tidak aktif atau tidak hadir, dan `mekanik_id` tidak berubah

#### Scenario: Mekanik nonaktif tidak dapat dipilih
- **WHEN** Service Advisor mencoba menugaskan mekanik dengan `is_active = false`
- **THEN** sistem menolak dengan pesan bahwa mekanik tersebut sedang tidak aktif atau tidak hadir, dan `mekanik_id` tidak berubah

### Requirement: Ubah Penugasan (Reassign)
Service Advisor SHALL dapat mengganti mekanik yang sedang ditugaskan pada suatu `layanan_service` ke mekanik lain yang aktif dan hadir, selama servis belum `Selesai Dikerjakan` atau `Sudah Diambil`.

#### Scenario: Reassign ke mekanik lain
- **WHEN** servis yang sedang ditangani mekanik "Budi Santoso" ditugaskan ulang ke mekanik "Siti Aminah" (aktif dan hadir)
- **THEN** `layanan_service.mekanik_id` berubah menjadi id "Siti Aminah"

### Requirement: Penugasan Terkunci Setelah Servis Selesai
`layanan_service` berstatus `Selesai Dikerjakan` atau `Sudah Diambil` MUST NOT dapat diubah `mekanik_id`-nya. Setiap upaya mengubah penugasan pada servis tersebut SHALL ditolak.

#### Scenario: Coba ubah penugasan pada servis yang sudah selesai dikerjakan
- **WHEN** Service Advisor mencoba mengubah `mekanik_id` pada servis berstatus `Selesai Dikerjakan`
- **THEN** sistem menolak perubahan dan `mekanik_id` tetap seperti semula

#### Scenario: Coba ubah penugasan pada servis yang sudah diambil
- **WHEN** Service Advisor mencoba mengubah `mekanik_id` pada servis berstatus `Sudah Diambil`
- **THEN** sistem menolak perubahan dan `mekanik_id` tetap seperti semula

### Requirement: Riwayat Penugasan Mekanik
Setiap kali `layanan_service.mekanik_id` diisi atau diubah ke mekanik lain, sistem SHALL otomatis mencatat satu baris `riwayat_penugasan_mekanik` (`layanan_service_id`, `mekanik_id` baru, `ditugaskan_oleh`, `waktu`).

#### Scenario: Penugasan pertama tercatat
- **WHEN** sebuah servis dengan `mekanik_id` semula `null` ditugaskan ke seorang mekanik
- **THEN** satu baris baru `riwayat_penugasan_mekanik` tercatat dengan `mekanik_id` mekanik tersebut

#### Scenario: Reassign tercatat sebagai baris baru
- **WHEN** sebuah servis di-reassign dari mekanik A ke mekanik B
- **THEN** satu baris baru `riwayat_penugasan_mekanik` dengan `mekanik_id` mekanik B tercatat, dan baris riwayat penugasan ke mekanik A sebelumnya tetap ada

### Requirement: Lihat Penugasan per Mekanik
Dari halaman Manajemen Mekanik, Service Advisor SHALL dapat melihat daftar nomor polisi kendaraan yang sedang ditangani (status selain `Sudah Diambil`) oleh seorang mekanik tertentu.

#### Scenario: Mekanik sedang menangani beberapa kendaraan
- **WHEN** Service Advisor membuka daftar kendaraan untuk mekanik yang sedang menangani 2 kendaraan aktif
- **THEN** kedua nomor polisi kendaraan tersebut ditampilkan beserta status masing-masing

#### Scenario: Mekanik belum menangani kendaraan apa pun
- **WHEN** Service Advisor membuka daftar kendaraan untuk mekanik yang belum ditugaskan ke servis manapun
- **THEN** daftar ditampilkan kosong

### Requirement: Nonaktifkan Mekanik yang Masih Bertugas Ditolak
Menonaktifkan mekanik (`is_active` menjadi `false`) SHALL ditolak selama mekanik tersebut masih menjadi `mekanik_id` pada satu atau lebih `layanan_service` berstatus selain `Sudah Diambil`.

#### Scenario: Tolak nonaktifkan mekanik dengan beban kerja aktif
- **WHEN** Service Advisor mencoba menonaktifkan mekanik yang sedang menangani 1 kendaraan berstatus `Dikerjakan`
- **THEN** sistem menolak dengan pesan bahwa mekanik tersebut masih menangani kendaraan aktif, dan `is_active` tetap `true`

#### Scenario: Izinkan nonaktifkan mekanik tanpa beban kerja aktif
- **WHEN** Service Advisor menonaktifkan mekanik yang tidak sedang menangani kendaraan aktif mana pun (termasuk yang riwayat penugasan lamanya sudah `Sudah Diambil`)
- **THEN** `mekanik.is_active` berubah menjadi `false`
