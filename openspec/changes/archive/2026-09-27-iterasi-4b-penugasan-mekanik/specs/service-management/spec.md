## MODIFIED Requirements

### Requirement: Ubah status satu ketuk
Setiap servis aktif di daftar dan di halaman detail SHALL memiliki tombol maju satu langkah yang berlabel status tujuan (misalnya "→ Dikerjakan").

- Perubahan MUST menyertakan status saat ini sebagai syarat. Bila status di database sudah berbeda, UI SHALL menampilkan pesan bahwa status sudah berubah lalu memuat ulang data.
- Langkah menuju `Selesai Dikerjakan` dan `Sudah Diambil` MUST didahului dialog konfirmasi. Dialog untuk `Sudah Diambil` menegaskan bahwa aksi ini final.
- Tombol MUST dinonaktifkan selama permintaan berjalan agar ketukan ganda tidak memajukan status dua kali.
- Tombol "→ Diperiksa" pada servis berstatus `Menunggu Antrian` yang belum memiliki mekanik yang ditugaskan (`mekanik_id` bernilai `null`) SHALL ditampilkan dalam keadaan nonaktif, baik di halaman daftar maupun detail, karena database menolak transisi ini tanpa mekanik.

#### Scenario: Maju tanpa konfirmasi
- **WHEN** SA mengetuk "→ Diperiksa" pada servis `Menunggu Antrian` yang sudah memiliki mekanik yang ditugaskan
- **THEN** status menjadi `Diperiksa` tanpa dialog konfirmasi

#### Scenario: Menyelesaikan servis
- **WHEN** SA mengetuk "→ Selesai Dikerjakan" lalu mengonfirmasi dialog
- **THEN** status menjadi `Selesai Dikerjakan` dan halaman detail menampilkan tanggal selesai

#### Scenario: Konfirmasi dibatalkan
- **WHEN** SA mengetuk "→ Sudah Diambil" lalu memilih batal di dialog
- **THEN** status tidak berubah

#### Scenario: Motor diambil
- **WHEN** SA mengonfirmasi "→ Sudah Diambil"
- **THEN** servis hilang dari daftar servis aktif

#### Scenario: Status sudah diubah di tablet lain
- **WHEN** SA mengetuk "→ Dikerjakan" pada data lama, padahal servis itu sudah `Dikerjakan` di database
- **THEN** status tidak maju ke tahap berikutnya, pesan "status sudah berubah" tampil, dan data dimuat ulang

#### Scenario: Tombol nonaktif tanpa mekanik
- **WHEN** SA membuka daftar servis atau detail servis untuk sebuah servis `Menunggu Antrian` yang `mekanik_id`-nya masih `null`
- **THEN** tombol "→ Diperiksa" tampil nonaktif (tidak dapat diketuk), baik di halaman daftar maupun detail

#### Scenario: Tombol aktif kembali setelah mekanik ditugaskan
- **WHEN** SA menugaskan mekanik ke servis `Menunggu Antrian` yang sebelumnya belum punya mekanik, lalu membuka kembali halaman daftar atau detailnya
- **THEN** tombol "→ Diperiksa" tampil aktif dan dapat diketuk
