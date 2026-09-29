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

### Requirement: Hasil pencarian diperbarui otomatis
Selama halaman publik menampilkan hasil untuk nomor polisi yang valid, halaman SHALL berlangganan sinyal broadcast `servis:<NOPOL>` untuk nomor polisi tersebut. Setiap kali sinyal diterima, halaman SHALL mengambil ulang data melalui `cek_status`, tanpa reload dan tanpa tindakan pelanggan (FR-7.3).

Aturan tambahan:
- Saat nomor polisi di URL berganti, langganan SHALL berpindah ke topik nomor polisi yang baru.
- Tanpa nomor polisi yang valid, halaman MUST NOT berlangganan channel apa pun.
- Pemuatan ulang karena sinyal MUST NOT menampilkan indikator memuat pada tombol "Cek Status" dan MUST NOT mengosongkan hasil yang sedang tampil.

#### Scenario: SA mengubah status saat pelanggan membuka halaman
- **WHEN** pelanggan membuka `/?nopol=DC1234AB`, lalu SA mengubah status servis kendaraan tersebut ke `Dikerjakan`
- **THEN** stepper dan badge di halaman pelanggan berpindah ke `Dikerjakan` tanpa reload

#### Scenario: Servis didaftarkan setelah pencarian tidak ditemukan
- **WHEN** halaman menampilkan "tidak ditemukan" untuk `DC5678XY`, lalu SA mendaftarkan servis untuk kendaraan itu
- **THEN** halaman otomatis menampilkan kartu servis aktif `DC5678XY`

#### Scenario: Servis dihapus
- **WHEN** halaman menampilkan servis aktif `Menunggu Antrian`, lalu SA menghapus servis tersebut
- **THEN** halaman otomatis memperbarui hasil sesuai data terbaru dari `cek_status`

#### Scenario: Ganti nomor polisi
- **WHEN** pelanggan mencari `DC1111AA`, lalu mencari `DC2222BB`
- **THEN** perubahan pada `DC1111AA` tidak lagi memicu pemuatan ulang, dan perubahan pada `DC2222BB` memicunya

#### Scenario: Kembali ke tab di HP
- **WHEN** pelanggan mengunci layar HP, lalu membuka kembali browser yang menampilkan hasil pencarian
- **THEN** halaman mengambil ulang data sehingga status yang tampil adalah status terbaru

### Requirement: Indikator pembaruan langsung
Saat hasil pencarian tampil, halaman SHALL menampilkan tiga hal:
1. Indikator koneksi realtime: "Live" saat tersambung, dan keterangan sedang menghubungkan ulang saat tidak tersambung.
2. Waktu pembaruan terakhir ("Diperbarui pukul HH:MM", WITA).
3. Pengumuman melalui region `aria-live="polite"` dengan teks "Status berubah menjadi <status>", disertai penanda visual singkat pada kartu servis. Pengumuman ini hanya muncul bila status servis aktif berubah dibanding tampilan sebelumnya.

Indikator koneksi MUST NOT menghalangi tampilan data yang sudah ada.

#### Scenario: Tersambung
- **WHEN** hasil pencarian tampil dan channel realtime tersambung
- **THEN** indikator menampilkan status "Live"

#### Scenario: Koneksi terputus
- **WHEN** koneksi realtime terputus
- **THEN** indikator menampilkan keterangan sedang menghubungkan ulang, sementara data terakhir tetap tampil

#### Scenario: Status berubah
- **WHEN** status servis aktif berubah dari `Diperiksa` ke `Dikerjakan` akibat sinyal realtime
- **THEN** pembaca layar mengumumkan "Status berubah menjadi Dikerjakan", kartu servis diberi penanda visual singkat, dan waktu pembaruan terakhir diperbarui

#### Scenario: Pembaruan tanpa perubahan status
- **WHEN** data dimuat ulang tetapi status servis aktif tetap sama
- **THEN** waktu pembaruan terakhir diperbarui tanpa pengumuman perubahan status
