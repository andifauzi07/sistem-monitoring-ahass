## ADDED Requirements

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
