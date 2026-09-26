# service-management Specification

## Purpose
Pengelolaan servis kendaraan oleh Service Advisor: pendaftaran, daftar, detail, edit, hapus, dan perubahan status servis (PRD FR-1 s.d. FR-3), di atas skema dan RPC database.

## Requirements
### Requirement: Rute kelola servis terproteksi
Aplikasi SHALL menyediakan rute `/servis` (daftar servis aktif), `/servis/baru` (tambah), `/servis/:id` (detail), dan `/servis/:id/edit` (edit). Keempatnya hanya dapat dibuka dalam keadaan `authenticated`, mengikuti proteksi rute Service Advisor. Id yang tidak ditemukan SHALL menampilkan pesan "Servis tidak ditemukan" beserta tautan kembali ke `/servis`.

#### Scenario: Tamu membuka daftar servis
- **WHEN** pengguna yang belum login membuka `/servis`
- **THEN** pengguna diarahkan ke `/login`, lalu kembali ke `/servis` setelah login

#### Scenario: Id servis tidak ada
- **WHEN** SA membuka `/servis/<id-yang-tidak-ada>`
- **THEN** halaman menampilkan "Servis tidak ditemukan" dan tautan ke `/servis`

### Requirement: Daftar servis aktif
Halaman `/servis` SHALL menampilkan semua `layanan_service` berstatus selain `Sudah Diambil`, diurutkan dari `tanggal_masuk` terlama. Setiap item MUST menampilkan nomor polisi terformat, jenis motor, nama pembawa, badge status, waktu masuk (WITA), dan tombol aksi status berikutnya. Halaman SHALL menyediakan:

- pencarian nomor polisi (tidak peka spasi dan huruf besar/kecil);
- filter per status;
- tombol "Servis Baru";
- tombol "Muat ulang".

Data SHALL dimuat ulang setelah setiap aksi dan saat tab kembali aktif. Selama memuat, halaman menampilkan indikator. Saat daftar kosong, halaman menampilkan pesan dan ajakan menambah servis.

#### Scenario: Servis yang sudah diambil tidak tampil
- **WHEN** terdapat tiga servis aktif dan satu servis `Sudah Diambil`
- **THEN** daftar hanya menampilkan tiga servis aktif

#### Scenario: Mencari nopol
- **WHEN** SA mengetik `dc 1234` di kolom pencarian
- **THEN** hanya servis dengan nomor polisi yang mengandung `DC1234` yang tampil

#### Scenario: Filter status
- **WHEN** SA memilih filter `Dikerjakan`
- **THEN** hanya servis berstatus `Dikerjakan` yang tampil

#### Scenario: Tab kembali aktif
- **WHEN** SA kembali ke tab aplikasi setelah membuka aplikasi lain
- **THEN** daftar dimuat ulang dari database

### Requirement: Tambah servis baru
Halaman `/servis/baru` SHALL menyediakan form dengan field nomor polisi, nama pembawa, nomor WA, jenis motor, kilometer, dan masalah (semua wajib). Penyimpanan dilakukan lewat RPC `daftar_servis`. Validasi di form MUST setara dengan validasi RPC dan ditampilkan per field sebelum permintaan dikirim. Selama menyimpan, tombol simpan dinonaktifkan. Setelah berhasil, SA diarahkan ke halaman detail servis baru.

#### Scenario: Simpan servis baru
- **WHEN** SA mengisi semua field dengan valid lalu menekan "Simpan"
- **THEN** servis tersimpan berstatus `Menunggu Antrian` dan SA diarahkan ke `/servis/<id-baru>`

#### Scenario: Field wajib kosong
- **WHEN** SA menekan "Simpan" dengan field masalah kosong
- **THEN** permintaan tidak dikirim dan field masalah ditandai wajib diisi

#### Scenario: Kendaraan masih punya servis aktif
- **WHEN** penyimpanan gagal dengan `SERVIS_AKTIF_ADA`
- **THEN** form menampilkan pesan bahwa kendaraan masih punya servis aktif beserta tautan ke servis tersebut, dan isian form tetap ada

### Requirement: Isi otomatis dari kunjungan terakhir
Di form tambah servis, setelah SA selesai mengetik nomor polisi yang sudah dikenal, aplikasi SHALL mengisi nama pembawa, nomor WA (dari `pelanggan`), dan jenis motor (dari layanan terakhir kendaraan tersebut). Isi otomatis MUST hanya mengisi field yang masih kosong. Bila kendaraan sedang punya servis aktif, form SHALL menampilkan peringatan beserta tautan ke servis tersebut sebelum SA menyimpan.

#### Scenario: Kendaraan pernah servis
- **WHEN** SA mengetik nopol kendaraan yang pernah servis, sementara field lain masih kosong
- **THEN** nama pembawa, nomor WA, dan jenis motor terisi dari data terakhir, dan kilometer serta masalah tetap kosong

#### Scenario: Field sudah diketik
- **WHEN** SA sudah mengetik nama pembawa lalu mengisi nopol kendaraan yang dikenal
- **THEN** nama pembawa yang diketik SA tidak ditimpa

#### Scenario: Kendaraan sedang diservis
- **WHEN** SA mengetik nopol kendaraan yang servisnya masih `Diperiksa`
- **THEN** form menampilkan peringatan dan tautan ke servis aktif tersebut

### Requirement: Edit layanan servis
Halaman `/servis/:id/edit` SHALL menampilkan form yang sama, terisi data layanan saat ini, dan menyimpan perubahan lewat RPC `ubah_servis`. Status tidak dapat diubah dari form ini. Setelah berhasil, SA diarahkan kembali ke halaman detail. Layanan `Sudah Diambil` MUST NOT dapat diedit: tombol edit tidak ditampilkan, dan membuka rute edit secara langsung menampilkan pesan bahwa servis terkunci.

#### Scenario: Koreksi data
- **WHEN** SA mengubah kilometer dan masalah lalu menyimpan
- **THEN** halaman detail menampilkan nilai baru dan status tidak berubah

#### Scenario: Koreksi nomor polisi
- **WHEN** SA mengubah nomor polisi yang salah ketik lalu menyimpan
- **THEN** halaman detail menampilkan nomor polisi baru

#### Scenario: Servis sudah diambil
- **WHEN** SA membuka `/servis/<id>/edit` untuk layanan `Sudah Diambil`
- **THEN** form tidak ditampilkan, dan halaman menampilkan pesan bahwa servis sudah diambil dan tidak dapat diubah

### Requirement: Ubah status satu ketuk
Setiap servis aktif di daftar dan di halaman detail SHALL memiliki tombol maju satu langkah yang berlabel status tujuan (misalnya "→ Dikerjakan").

- Perubahan MUST menyertakan status saat ini sebagai syarat. Bila status di database sudah berbeda, UI SHALL menampilkan pesan bahwa status sudah berubah lalu memuat ulang data.
- Langkah menuju `Selesai Dikerjakan` dan `Sudah Diambil` MUST didahului dialog konfirmasi. Dialog untuk `Sudah Diambil` menegaskan bahwa aksi ini final.
- Tombol MUST dinonaktifkan selama permintaan berjalan agar ketukan ganda tidak memajukan status dua kali.

#### Scenario: Maju tanpa konfirmasi
- **WHEN** SA mengetuk "→ Diperiksa" pada servis `Menunggu Antrian`
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

### Requirement: Batalkan perubahan status
Setelah perubahan status maju berhasil, kecuali ke `Sudah Diambil`, aplikasi SHALL menampilkan toast yang menyebut status baru beserta tombol "Batalkan" selama sekitar 5 detik. Menekan "Batalkan" SHALL mengembalikan status ke nilai sebelumnya dengan syarat status saat ini masih sama dengan status baru tersebut.

#### Scenario: Salah ketuk dibatalkan
- **WHEN** SA mengetuk "→ Dikerjakan" lalu menekan "Batalkan" di toast dalam 5 detik
- **THEN** status kembali ke `Diperiksa`

#### Scenario: Toast kedaluwarsa
- **WHEN** 5 detik berlalu tanpa menekan "Batalkan"
- **THEN** toast hilang dan status tetap

#### Scenario: Tanpa pembatalan untuk Sudah Diambil
- **WHEN** SA mengonfirmasi "→ Sudah Diambil"
- **THEN** toast yang tampil tidak memiliki tombol "Batalkan"

### Requirement: Mundur satu langkah dari halaman detail
Halaman detail servis aktif yang statusnya bukan `Menunggu Antrian` SHALL menyediakan aksi "Kembalikan ke ⟨status sebelumnya⟩" dengan dialog konfirmasi. Aksi ini MUST NOT tersedia di halaman daftar.

#### Scenario: Koreksi status yang terlanjur maju
- **WHEN** SA membuka detail servis `Selesai Dikerjakan`, memilih "Kembalikan ke Dikerjakan", lalu mengonfirmasi
- **THEN** status menjadi `Dikerjakan` dan tanggal selesai tidak lagi ditampilkan

### Requirement: Hapus servis
Halaman detail SHALL menampilkan aksi "Hapus" hanya untuk servis berstatus `Menunggu Antrian`. Aksi ini didahului dialog konfirmasi yang menyebut nomor polisi, lalu menghapus lewat RPC `hapus_servis`. Setelah berhasil, SA diarahkan ke `/servis`.

#### Scenario: Hapus servis yang terlanjur dibuat
- **WHEN** SA menekan "Hapus" pada servis `Menunggu Antrian` lalu mengonfirmasi
- **THEN** servis terhapus dan SA kembali ke `/servis` tanpa servis tersebut

#### Scenario: Servis sudah diproses
- **WHEN** SA membuka detail servis `Diperiksa`
- **THEN** aksi "Hapus" tidak ditampilkan

### Requirement: Detail servis dan linimasa riwayat
Halaman `/servis/:id` SHALL menampilkan:

- seluruh data layanan (nomor polisi, nama pembawa, nomor WA, jenis motor, kilometer, masalah, status, tanggal masuk, dan tanggal selesai bila ada);
- linimasa `riwayat_status` terurut waktu, berisi status, waktu (WITA), dan nama SA yang mengubah.

Layanan `Sudah Diambil` ditampilkan read-only tanpa aksi apa pun.

#### Scenario: Linimasa status
- **WHEN** SA membuka detail servis yang sudah melewati `Menunggu Antrian`, `Diperiksa`, dan `Dikerjakan`
- **THEN** linimasa menampilkan ketiga status berurutan beserta waktu dan nama SA

#### Scenario: Servis sudah diambil
- **WHEN** SA membuka detail servis `Sudah Diambil`
- **THEN** data dan linimasa tampil tanpa tombol ubah status, edit, maupun hapus

### Requirement: Pesan error Bahasa Indonesia
Setiap kegagalan operasi servis SHALL ditampilkan sebagai pesan Bahasa Indonesia yang dipetakan dari kode error database (`SERVIS_AKTIF_ADA`, `TRANSISI_STATUS_TIDAK_VALID`, `SERVIS_TERKUNCI`, `HAPUS_TIDAK_DIIZINKAN`, `DATA_TIDAK_VALID`, `SERVIS_TIDAK_DITEMUKAN`), gangguan jaringan, atau error umum. Kode mentah MUST NOT ditampilkan.

#### Scenario: Gangguan jaringan saat ubah status
- **WHEN** permintaan ubah status gagal karena Supabase tidak dapat dijangkau
- **THEN** tampil pesan bahwa server tidak dapat dihubungi dan status di layar tidak berubah

### Requirement: Tata letak ramah tablet
Halaman kelola servis SHALL nyaman dipakai di tablet, baik portrait maupun landscape:

- target sentuh tombol aksi minimal 44 px;
- tidak ada informasi yang hanya tersedia lewat hover;
- tombol aksi status selalu terlihat tanpa membuka menu;
- field form memakai keyboard layar yang sesuai: huruf kapital untuk nomor polisi, telepon untuk nomor WA, dan numerik untuk kilometer.

#### Scenario: Tablet portrait
- **WHEN** halaman `/servis` dibuka pada lebar layar 768 px
- **THEN** semua item dan tombol aksinya terlihat tanpa scroll horizontal

#### Scenario: Keyboard kilometer
- **WHEN** SA mengetuk field kilometer di tablet
- **THEN** keyboard numerik yang muncul
