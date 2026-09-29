# public-monitoring Specification

## Purpose
Halaman publik tanpa login bagi pelanggan untuk mencari servis berdasarkan nomor polisi dan melihat status servis aktif beserta riwayat kunjungan, dengan nomor polisi tersinkron di URL.
## Requirements
### Requirement: Pencarian servis berdasarkan nomor polisi
Halaman publik `/` SHALL menyediakan satu input nomor polisi dan tombol "Cek Status" yang dapat dipakai tanpa login (FR-7.1). Sebelum memanggil RPC `cek_status`, input SHALL dinormalisasi dengan `normalizeNopol` (huruf kapital, hanya huruf dan angka). Input yang panjangnya kurang dari 3 karakter setelah dinormalisasi MUST ditolak di sisi klien dengan pesan validasi, tanpa memanggil RPC.

#### Scenario: Pencarian dengan format bebas
- **WHEN** pelanggan mengetik `dc 1234-ab` lalu menekan "Cek Status"
- **THEN** sistem memanggil `cek_status` dengan nilai `DC1234AB` dan menampilkan hasilnya

#### Scenario: Input terlalu pendek
- **WHEN** pelanggan mengirim input kosong atau `d 1`
- **THEN** sistem menampilkan pesan validasi di dekat input dan tidak memanggil `cek_status`

#### Scenario: Sedang memuat
- **WHEN** permintaan ke `cek_status` sedang berjalan
- **THEN** tombol "Cek Status" dinonaktifkan dan ditampilkan indikator memuat

### Requirement: Tampilan servis aktif dengan tahapan status
Bila hasil pencarian memuat servis dengan status selain `Sudah Diambil`, halaman SHALL menampilkan kartu servis aktif berisi nomor polisi (format tampilan `formatNopol`), jenis motor, status saat ini, tanggal masuk, dan tanggal selesai bila terisi. Kartu SHALL memuat penanda tahapan (stepper) untuk seluruh 5 status sesuai urutan enum `status_servis`: tahap sebelum status saat ini ditandai selesai, tahap saat ini ditandai aktif, dan tahap berikutnya ditandai belum dilalui. Waktu SHALL ditampilkan dalam zona WITA.

#### Scenario: Servis sedang dikerjakan
- **WHEN** pencarian `DC1234AB` mengembalikan servis berstatus `Dikerjakan`
- **THEN** kartu servis aktif menampilkan `Menunggu Antrian` dan `Diperiksa` sebagai selesai, `Dikerjakan` sebagai aktif, serta `Selesai Dikerjakan` dan `Sudah Diambil` sebagai belum dilalui

#### Scenario: Servis selesai dan siap diambil
- **WHEN** servis aktif berstatus `Selesai Dikerjakan`
- **THEN** kartu menampilkan tanggal selesai dan keterangan bahwa kendaraan siap diambil

#### Scenario: Data pribadi tidak ditampilkan
- **WHEN** kartu servis aktif ditampilkan
- **THEN** kartu tidak memuat nama pembawa, nomor WA, keluhan, kilometer, nama mekanik, maupun id internal

### Requirement: Riwayat kunjungan sebelumnya
Servis yang berstatus `Sudah Diambil` SHALL ditampilkan sebagai riwayat kunjungan sebelumnya dengan kolom No, No Polisi, Status Unit, dan tanggal masuk (FR-7.2), diurutkan dari kunjungan terbaru. Riwayat MUST dibatasi paling banyak 5 entri dan SHALL dapat dibuka-tutup oleh pelanggan. Bagian riwayat MUST NOT ditampilkan bila tidak ada kunjungan sebelumnya.

#### Scenario: Kendaraan dengan servis aktif dan riwayat
- **WHEN** pencarian mengembalikan satu servis `Dikerjakan` dan dua servis `Sudah Diambil`
- **THEN** halaman menampilkan kartu servis aktif, disusul riwayat kunjungan sebelumnya berisi 2 entri

#### Scenario: Riwayat lebih dari 5
- **WHEN** kendaraan memiliki 8 kunjungan `Sudah Diambil`
- **THEN** riwayat hanya menampilkan 5 kunjungan terbaru

#### Scenario: Tidak ada servis yang sedang berjalan
- **WHEN** seluruh servis hasil pencarian berstatus `Sudah Diambil`
- **THEN** halaman menampilkan keterangan bahwa tidak ada servis yang sedang berjalan untuk kendaraan tersebut, disusul riwayat kunjungan sebelumnya

### Requirement: Hasil tidak ditemukan dan kegagalan
Halaman SHALL membedakan keadaan "tidak ditemukan" dari kegagalan permintaan. Bila `cek_status` mengembalikan hasil kosong, halaman SHALL menampilkan pesan bahwa nomor polisi belum terdaftar beserta saran untuk memeriksa penulisan. Bila permintaan gagal (mis. jaringan), halaman SHALL menampilkan pesan error dalam Bahasa Indonesia dan tombol untuk mencoba lagi.

#### Scenario: Nomor polisi tidak terdaftar
- **WHEN** pelanggan mencari nomor polisi yang tidak memiliki servis apa pun
- **THEN** halaman menampilkan pesan bahwa nomor polisi tersebut tidak ditemukan, tanpa kartu servis maupun riwayat

#### Scenario: Gagal terhubung
- **WHEN** permintaan ke `cek_status` gagal karena jaringan
- **THEN** halaman menampilkan pesan error jaringan dan tombol "Coba lagi" yang mengulang pencarian nomor polisi yang sama

### Requirement: Nomor polisi tersinkron dengan URL
Setiap pencarian yang lolos validasi SHALL menyimpan nomor polisi ternormalisasi di URL sebagai query param `nopol` (mis. `/?nopol=DC1234AB`) sehingga tercatat di riwayat browser. Saat halaman dibuka dengan query param `nopol`, halaman SHALL mengisi input dengan nilai tersebut dan langsung menjalankan pencarian. Nilai `nopol` di URL yang kurang dari 3 karakter setelah dinormalisasi MUST NOT memicu pemanggilan RPC dan SHALL menampilkan pesan validasi.

#### Scenario: Membuka tautan langsung
- **WHEN** pelanggan membuka `/?nopol=dc1234ab`
- **THEN** input terisi dengan nomor polisi tersebut dan hasil pencarian `DC1234AB` langsung ditampilkan tanpa perlu menekan tombol

#### Scenario: Pencarian memperbarui URL
- **WHEN** pelanggan mencari `DC 5678 XY`
- **THEN** URL berubah menjadi `/?nopol=DC5678XY`

#### Scenario: Kembali ke pencarian sebelumnya
- **WHEN** pelanggan mencari dua nomor polisi berbeda secara berurutan lalu menekan tombol Back browser
- **THEN** halaman kembali menampilkan hasil nomor polisi pertama

#### Scenario: Muat ulang halaman
- **WHEN** pelanggan me-refresh halaman yang sedang menampilkan hasil pencarian
- **THEN** hasil pencarian untuk nomor polisi yang sama ditampilkan kembali
