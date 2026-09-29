# sa-dashboard Specification

## Purpose
Dashboard ringkasan operasional bagi Service Advisor: kartu jumlah unit yang sedang dalam proses, kartu kehadiran mekanik, dan tabel aktifitas servis hari ini.

## Requirements
### Requirement: Kartu Total Unit Entry di Pit
Dashboard SHALL menampilkan kartu jumlah kendaraan yang sedang dalam proses, dihitung dari seluruh baris `layanan_service` dengan status selain `Sudah Diambil`, tanpa dibatasi tanggal masuk.

#### Scenario: Ada beberapa servis aktif dengan status berbeda
- **WHEN** terdapat servis dengan status `Menunggu Antrian`, `Diperiksa`, dan `Dikerjakan`, serta satu servis lain berstatus `Sudah Diambil`
- **THEN** kartu Total Unit Entry di Pit menampilkan jumlah 3 (servis `Sudah Diambil` tidak dihitung)

#### Scenario: Servis aktif dari hari sebelumnya tetap terhitung
- **WHEN** sebuah servis berstatus `Dikerjakan` memiliki `tanggal_masuk` kemarin dan belum mencapai `Sudah Diambil`
- **THEN** servis tersebut tetap dihitung dalam Total Unit Entry di Pit hari ini

### Requirement: Kartu Mekanik yang Hadir
Dashboard SHALL menampilkan kartu jumlah mekanik dengan `status_hadir = true` dari seluruh mekanik `is_active = true`, dan SHALL tetap menampilkan kartu ini meskipun nilainya nol.

#### Scenario: Belum ada data mekanik
- **WHEN** tabel `mekanik` tidak memiliki baris apa pun
- **THEN** kartu Mekanik yang Hadir menampilkan "0 dari 0" dan tetap ditampilkan (tidak disembunyikan)

#### Scenario: Sebagian mekanik hadir
- **WHEN** terdapat 5 mekanik aktif dan 3 di antaranya memiliki `status_hadir = true`
- **THEN** kartu Mekanik yang Hadir menampilkan "3 dari 5"

### Requirement: Tabel Aktifitas Hari Ini
Dashboard SHALL menampilkan tabel seluruh servis dengan status selain `Sudah Diambil`, dengan kolom Mekanik, Tipe Motor, Keterangan, dan Status. Kolom Mekanik SHALL menampilkan nama mekanik yang ditugaskan (`mekanik.nama`), bukan `mekanik_id` mentah.

#### Scenario: Servis belum memiliki mekanik yang ditugaskan
- **WHEN** sebuah servis aktif memiliki `mekanik_id = null`
- **THEN** kolom Mekanik pada baris tersebut menampilkan "-"

#### Scenario: Servis sudah memiliki mekanik yang ditugaskan
- **WHEN** sebuah servis aktif memiliki `mekanik_id` yang merujuk ke mekanik bernama "Budi Santoso"
- **THEN** kolom Mekanik pada baris tersebut menampilkan "Budi Santoso", bukan UUID `mekanik_id`

#### Scenario: Menampilkan data servis aktif
- **WHEN** sebuah servis aktif memiliki `jenis_motor = "Honda Beat"`, `masalah = "Ganti oli"`, dan `status = "Dikerjakan"`
- **THEN** baris tabel menampilkan Tipe Motor "Honda Beat", Keterangan "Ganti oli", dan Status "Dikerjakan"

### Requirement: Dashboard diperbarui otomatis
Dashboard SHALL berlangganan perubahan tabel `layanan_service` dan `mekanik`. Setiap perubahan SHALL memicu pemuatan ulang otomatis, sehingga kartu Total Unit Entry di Pit, kartu Mekanik yang Hadir, dan Tabel Aktifitas Hari Ini selalu mencerminkan data terbaru tanpa reload (FR-3.4). Data SHALL juga dimuat ulang saat tab kembali aktif dan saat koneksi realtime pulih.

#### Scenario: Servis baru didaftarkan dari tablet lain
- **WHEN** dashboard terbuka di tablet A, lalu SA mendaftarkan servis baru di tablet B
- **THEN** kartu Total Unit Entry di Pit dan Tabel Aktifitas Hari Ini di tablet A bertambah tanpa reload

#### Scenario: Status servis berubah
- **WHEN** status servis diubah dari tablet lain
- **THEN** badge status pada Tabel Aktifitas Hari Ini di dashboard ikut berubah

#### Scenario: Kehadiran mekanik berubah
- **WHEN** status hadir seorang mekanik diubah di halaman Manajemen Mekanik
- **THEN** kartu Mekanik yang Hadir di dashboard yang sedang terbuka diperbarui tanpa reload
