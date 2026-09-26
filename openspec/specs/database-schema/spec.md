# database-schema Specification

## Purpose
Skema PostgreSQL/Supabase untuk seluruh entitas sistem monitoring servis AHASS (PRD Bagian 7): enum status servis, tabel inti, constraint, trigger log, dan Row Level Security.
## Requirements
### Requirement: Enum status servis
Database SHALL mendefinisikan tipe enum `status_servis` dengan nilai berurutan: `Menunggu Antrian`, `Diperiksa`, `Dikerjakan`, `Selesai Dikerjakan`, `Sudah Diambil`. Kolom `layanan_service.status` MUST bertipe enum ini dengan default `Menunggu Antrian`.

#### Scenario: Nilai status valid
- **WHEN** sebuah `layanan_service` disimpan dengan status `Dikerjakan`
- **THEN** penyimpanan berhasil

#### Scenario: Nilai status tidak valid
- **WHEN** sebuah `layanan_service` disimpan dengan status `Selesai`
- **THEN** database menolak dengan error tipe enum

### Requirement: Tabel inti sesuai PRD Bagian 7
Database SHALL memiliki tabel `service_advisors`, `mekanik`, `pelanggan`, `layanan_service`, `riwayat_status`, dan `riwayat_penugasan_mekanik` dengan nama kolom persis seperti PRD Bagian 7.1–7.6, termasuk foreign key yang disebutkan.

#### Scenario: Struktur kolom
- **WHEN** skema diperiksa setelah migrasi
- **THEN** `layanan_service` memiliki kolom `nomor_polisi`, `nama_pembawa`, `nomor_wa`, `jenis_motor`, `kilometer`, `masalah`, `status`, `service_advisor_id`, `pelanggan_id`, `mekanik_id`, `tanggal_masuk`, `tanggal_selesai`, `created_at`, `updated_at`

#### Scenario: Mekanik opsional
- **WHEN** `layanan_service` dibuat tanpa `mekanik_id`
- **THEN** penyimpanan berhasil dan `mekanik_id` bernilai `null`

### Requirement: Pelanggan merepresentasikan kendaraan
Tabel `pelanggan` SHALL berisi satu baris per kendaraan dengan `nomor_polisi` unik. `layanan_service.pelanggan_id` SHALL merujuk ke `pelanggan.id` sehingga satu kendaraan dapat memiliki banyak riwayat servis. `nama_pembawa` dan `nomor_wa` SHALL disimpan per kunjungan di `layanan_service`.

#### Scenario: Nomor polisi duplikat
- **WHEN** baris `pelanggan` kedua disimpan dengan `nomor_polisi` yang sama
- **THEN** database menolak dengan pelanggaran unique constraint

#### Scenario: Servis berulang untuk kendaraan yang sama
- **WHEN** dua `layanan_service` dengan `pelanggan_id` sama dibuat, dan yang pertama berstatus `Sudah Diambil`
- **THEN** keduanya tersimpan

### Requirement: Satu servis aktif per kendaraan
Database SHALL mencegah lebih dari satu `layanan_service` dengan status selain `Sudah Diambil` untuk `pelanggan_id` yang sama.

#### Scenario: Servis aktif ganda
- **WHEN** `layanan_service` baru dibuat untuk kendaraan yang masih punya servis berstatus `Dikerjakan`
- **THEN** database menolak dengan pelanggaran unique constraint

### Requirement: Normalisasi nomor polisi
Nomor polisi SHALL disimpan dalam bentuk ternormalisasi: huruf kapital tanpa spasi, tanda hubung, atau titik. Normalisasi MUST ditegakkan di database sehingga input `dc 1234-ab` tersimpan sebagai `DC1234AB`.

#### Scenario: Input dengan spasi dan huruf kecil
- **WHEN** `pelanggan` disimpan dengan `nomor_polisi = 'dc 1234 ab'`
- **THEN** nilai yang tersimpan adalah `DC1234AB`

### Requirement: Sinkronisasi akun Service Advisor
Setiap user baru di `auth.users` SHALL otomatis memiliki baris di `service_advisors` dengan `id` sama dan `email` tersalin; `nama` diambil dari metadata `nama` bila ada, selain itu dari bagian lokal email.

#### Scenario: User dibuat dari dashboard Supabase
- **WHEN** admin membuat user `sa@ahass.id` di Supabase Auth
- **THEN** baris `service_advisors` dengan `id` user tersebut dan `email = 'sa@ahass.id'` terbentuk

### Requirement: Log perubahan status otomatis
Setiap insert `layanan_service` dan setiap perubahan nilai `status` SHALL otomatis mencatat baris `riwayat_status` (`status_baru`, `diubah_oleh = auth.uid()`, `waktu = now()`). Perubahan kolom lain tanpa perubahan status MUST NOT membuat baris log.

#### Scenario: Status berubah
- **WHEN** status diubah dari `Diperiksa` ke `Dikerjakan`
- **THEN** satu baris `riwayat_status` dengan `status_baru = 'Dikerjakan'` tercatat

#### Scenario: Hanya masalah yang diedit
- **WHEN** hanya kolom `masalah` yang diubah
- **THEN** tidak ada baris `riwayat_status` baru

### Requirement: Timestamp updated_at otomatis
Kolom `layanan_service.updated_at` SHALL diperbarui otomatis ke waktu sekarang pada setiap update.

#### Scenario: Update baris
- **WHEN** baris `layanan_service` diubah
- **THEN** `updated_at` bernilai waktu update tersebut

### Requirement: Row Level Security
RLS SHALL aktif di semua tabel publik. Role `authenticated` SHALL memiliki akses baca/tulis penuh. Role `anon` MUST NOT dapat membaca maupun menulis tabel mana pun secara langsung.

#### Scenario: Anon membaca tabel
- **WHEN** klien tanpa login melakukan `select` pada `layanan_service`
- **THEN** hasilnya kosong atau ditolak, tanpa data pelanggan apa pun

#### Scenario: Service Advisor membaca tabel
- **WHEN** klien yang login melakukan `select` pada `mekanik`
- **THEN** seluruh baris dikembalikan

### Requirement: Migrasi terversi
Seluruh skema SHALL didefinisikan dalam file SQL di `supabase/migrations/` yang dapat dijalankan ulang dari database kosong dan menghasilkan skema yang sama.

#### Scenario: Menjalankan migrasi di project kosong
- **WHEN** file migrasi dijalankan berurutan di project Supabase baru
- **THEN** semua tabel, enum, trigger, policy, dan fungsi terbentuk tanpa error

