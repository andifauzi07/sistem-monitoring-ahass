## ADDED Requirements

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
Dashboard SHALL menampilkan tabel seluruh servis dengan status selain `Sudah Diambil`, dengan kolom Mekanik, Tipe Motor, Keterangan, dan Status.

#### Scenario: Servis belum memiliki mekanik yang ditugaskan
- **WHEN** sebuah servis aktif memiliki `mekanik_id = null`
- **THEN** kolom Mekanik pada baris tersebut menampilkan "-"

#### Scenario: Menampilkan data servis aktif
- **WHEN** sebuah servis aktif memiliki `jenis_motor = "Honda Beat"`, `masalah = "Ganti oli"`, dan `status = "Dikerjakan"`
- **THEN** baris tabel menampilkan Tipe Motor "Honda Beat", Keterangan "Ganti oli", dan Status "Dikerjakan"
