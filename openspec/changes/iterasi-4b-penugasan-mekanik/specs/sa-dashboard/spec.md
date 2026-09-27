## MODIFIED Requirements

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
