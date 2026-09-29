## MODIFIED Requirements

### Requirement: Daftar servis aktif
Halaman `/servis` SHALL menampilkan semua `layanan_service` berstatus selain `Sudah Diambil`, diurutkan dari `tanggal_masuk` terlama. Setiap item MUST menampilkan nomor polisi terformat, jenis motor, nama pembawa, badge status, waktu masuk (WITA), dan tombol aksi status berikutnya. Halaman SHALL menyediakan:

- pencarian nomor polisi (tidak peka spasi dan huruf besar/kecil);
- filter per status;
- tombol "Servis Baru";
- tombol "Muat ulang".

Data SHALL dimuat ulang dalam kondisi berikut:
- setelah setiap aksi;
- saat tab kembali aktif;
- saat koneksi realtime pulih;
- secara otomatis setiap kali `layanan_service` berubah, termasuk perubahan dari perangkat lain (lihat capability `realtime-updates`).

Pemuatan ulang otomatis MUST mempertahankan pencarian dan filter yang sedang dipakai. Selama pemuatan awal, halaman menampilkan indikator. Saat daftar kosong, halaman menampilkan pesan dan ajakan menambah servis.

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

#### Scenario: Perubahan dari tablet lain
- **WHEN** daftar servis terbuka di tablet A dengan filter `Diperiksa`, lalu SA di tablet B memajukan salah satu servis ke `Dikerjakan`
- **THEN** servis tersebut hilang dari daftar terfilter di tablet A tanpa reload, dan filter `Diperiksa` tetap terpilih

## ADDED Requirements

### Requirement: Detail servis diperbarui otomatis
Halaman detail servis SHALL berlangganan perubahan servis yang sedang dibuka. Setiap kali servis tersebut diubah, termasuk dari perangkat lain, data servis beserta linimasa riwayat status dan mekanik yang ditugaskan SHALL dimuat ulang otomatis. Bila servis dihapus dari perangkat lain, halaman SHALL menampilkan keadaan servis tidak ditemukan, sama seperti saat membuka id yang tidak ada.

#### Scenario: Status diubah di tablet lain
- **WHEN** detail servis terbuka di tablet A, lalu SA di tablet B memajukan status servis tersebut
- **THEN** status, tombol aksi, dan linimasa riwayat di tablet A diperbarui tanpa reload

#### Scenario: Servis lain berubah
- **WHEN** detail servis X terbuka, lalu servis Y (bukan X) diubah
- **THEN** halaman detail servis X tidak dimuat ulang

#### Scenario: Servis dihapus di tablet lain
- **WHEN** detail servis berstatus `Menunggu Antrian` terbuka di tablet A, lalu servis tersebut dihapus dari tablet B
- **THEN** tablet A menampilkan keadaan servis tidak ditemukan

### Requirement: Halaman edit servis tanpa pembaruan otomatis
Halaman edit servis MUST NOT memuat ulang data secara otomatis karena perubahan realtime, agar isian form yang sedang diketik tidak tertimpa. Aturan bisnis di database tetap berlaku saat formulir disimpan.

#### Scenario: Servis diubah saat form sedang diisi
- **WHEN** SA sedang mengisi form edit di tablet A, lalu status servis yang sama dimajukan dari tablet B
- **THEN** isian form di tablet A tidak berubah sampai SA menyimpan atau meninggalkan halaman
