## ADDED Requirements

### Requirement: Tambah Mekanik
Service Advisor SHALL dapat menambahkan mekanik baru dengan mengisi nama. Status hadir mekanik baru SHALL default `false` dan `is_active` SHALL default `true`.

#### Scenario: Tambah mekanik dengan nama valid
- **WHEN** Service Advisor mengisi nama "Budi Santoso" dan menekan simpan
- **THEN** baris baru tersimpan di tabel `mekanik` dengan `nama = "Budi Santoso"`, `status_hadir = false`, `is_active = true`, dan muncul di daftar mekanik

#### Scenario: Nama kosong ditolak
- **WHEN** Service Advisor mencoba menyimpan mekanik dengan nama kosong atau hanya spasi
- **THEN** sistem menampilkan pesan "Nama mekanik tidak boleh kosong." dan tidak menyimpan data

### Requirement: Edit Nama Mekanik
Service Advisor SHALL dapat mengubah nama mekanik yang sudah terdaftar, termasuk mekanik yang sedang tidak aktif.

#### Scenario: Ubah nama mekanik
- **WHEN** Service Advisor mengubah nama mekanik dari "Budi Santoso" menjadi "Budi S." dan menyimpan
- **THEN** kolom `nama` pada baris mekanik tersebut diperbarui menjadi "Budi S."

### Requirement: Ubah Status Hadir
Service Advisor SHALL dapat mengubah status hadir (hadir/tidak hadir) mekanik aktif kapan saja, dan perubahan ini SHALL langsung tercermin di kartu "Mekanik yang Hadir" pada Dashboard.

#### Scenario: Tandai mekanik hadir
- **WHEN** Service Advisor mengubah status hadir mekanik "Budi Santoso" dari tidak hadir menjadi hadir
- **THEN** `mekanik.status_hadir` untuk baris tersebut menjadi `true`

#### Scenario: Tandai mekanik tidak hadir
- **WHEN** Service Advisor mengubah status hadir mekanik yang sebelumnya hadir menjadi tidak hadir
- **THEN** `mekanik.status_hadir` untuk baris tersebut menjadi `false`

### Requirement: Nonaktifkan Mekanik
Service Advisor SHALL dapat menonaktifkan mekanik (soft delete via `is_active = false`) tanpa menghapus baris atau riwayat penugasan terkait. Mekanik nonaktif SHALL tidak muncul di daftar mekanik aktif maupun pilihan penugasan.

#### Scenario: Nonaktifkan mekanik
- **WHEN** Service Advisor menonaktifkan mekanik "Budi Santoso"
- **THEN** `mekanik.is_active` untuk baris tersebut menjadi `false`, baris tidak dihapus, dan mekanik tersebut tidak lagi muncul di daftar mekanik aktif

#### Scenario: Mekanik nonaktif tidak bisa dinonaktifkan ulang tanpa efek
- **WHEN** Service Advisor melihat daftar mekanik aktif setelah menonaktifkan seorang mekanik
- **THEN** mekanik yang dinonaktifkan tidak tampil di daftar tersebut

### Requirement: Daftar Mekanik dan Beban Kerja
Sistem SHALL menampilkan daftar seluruh mekanik dengan `is_active = true`, beserta status hadir masing-masing dan jumlah kendaraan yang sedang ditanganinya (baris `layanan_service` dengan `mekanik_id` mekanik tersebut dan status ≠ `Sudah Diambil`).

#### Scenario: Mekanik belum menangani kendaraan apa pun
- **WHEN** seorang mekanik aktif belum pernah ditugaskan ke `layanan_service` mana pun (`mekanik_id` pada semua servis aktif tidak merujuk ke mekanik ini)
- **THEN** beban kerja mekanik tersebut ditampilkan sebagai 0

#### Scenario: Mekanik sedang menangani beberapa kendaraan
- **WHEN** terdapat 3 baris `layanan_service` berstatus selain `Sudah Diambil` dengan `mekanik_id` yang sama menunjuk ke satu mekanik
- **THEN** beban kerja mekanik tersebut ditampilkan sebagai 3

#### Scenario: Daftar hanya menampilkan mekanik aktif
- **WHEN** terdapat mekanik dengan `is_active = false`
- **THEN** mekanik tersebut tidak muncul pada daftar mekanik
