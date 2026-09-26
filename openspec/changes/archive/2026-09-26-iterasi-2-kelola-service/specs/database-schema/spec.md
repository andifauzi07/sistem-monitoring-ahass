## MODIFIED Requirements

### Requirement: Enum status servis
Database SHALL mendefinisikan tipe enum `status_servis` dengan nilai berurutan: `Menunggu Antrian`, `Diperiksa`, `Dikerjakan`, `Selesai Dikerjakan`, `Sudah Diambil`. Kolom `layanan_service.status` MUST bertipe enum ini dengan default `Menunggu Antrian`.

#### Scenario: Nilai status valid
- **WHEN** status sebuah `layanan_service` berstatus `Diperiksa` diubah menjadi `Dikerjakan`
- **THEN** penyimpanan berhasil

#### Scenario: Nilai status tidak valid
- **WHEN** sebuah `layanan_service` disimpan dengan status `Selesai`
- **THEN** database menolak dengan error tipe enum

## ADDED Requirements

### Requirement: Servis baru selalu dimulai dari Menunggu Antrian
Setiap insert `layanan_service` SHALL berstatus `Menunggu Antrian` dan `tanggal_selesai` bernilai `null`. Insert dengan status lain MUST ditolak.

#### Scenario: Insert dengan status awal
- **WHEN** `layanan_service` baru disimpan tanpa menyebut status
- **THEN** status tersimpan `Menunggu Antrian` dan `tanggal_selesai` bernilai `null`

#### Scenario: Insert dengan status lanjutan
- **WHEN** `layanan_service` baru disimpan dengan status `Dikerjakan`
- **THEN** database menolak dengan error `TRANSISI_STATUS_TIDAK_VALID`

### Requirement: Transisi status satu langkah
Perubahan `layanan_service.status` SHALL hanya diizinkan ke status tepat satu posisi sebelum atau sesudahnya dalam urutan enum `status_servis`. Perubahan yang melompati tahap MUST ditolak dengan error `TRANSISI_STATUS_TIDAK_VALID`. Aturan ini MUST ditegakkan oleh database sehingga berlaku untuk semua jalur akses.

#### Scenario: Maju satu langkah
- **WHEN** status diubah dari `Menunggu Antrian` ke `Diperiksa`
- **THEN** perubahan tersimpan dan satu baris `riwayat_status` tercatat

#### Scenario: Mundur satu langkah
- **WHEN** status diubah dari `Dikerjakan` ke `Diperiksa`
- **THEN** perubahan tersimpan

#### Scenario: Melompati tahap
- **WHEN** status diubah dari `Menunggu Antrian` langsung ke `Dikerjakan`
- **THEN** database menolak dengan error `TRANSISI_STATUS_TIDAK_VALID` dan status tidak berubah

### Requirement: Tanggal selesai dikelola database
`layanan_service.tanggal_selesai` SHALL diisi waktu sekarang saat status berubah dari `Dikerjakan` ke `Selesai Dikerjakan`, dan SHALL dikosongkan saat status mundur dari `Selesai Dikerjakan` ke `Dikerjakan`. Pada perubahan lain, nilai `tanggal_selesai` MUST dipertahankan dan tidak dapat diisi manual.

#### Scenario: Servis selesai dikerjakan
- **WHEN** status diubah dari `Dikerjakan` ke `Selesai Dikerjakan`
- **THEN** `tanggal_selesai` terisi waktu perubahan tersebut

#### Scenario: Selesai dibatalkan
- **WHEN** status diubah dari `Selesai Dikerjakan` kembali ke `Dikerjakan`
- **THEN** `tanggal_selesai` bernilai `null`

#### Scenario: Motor diambil
- **WHEN** status diubah dari `Selesai Dikerjakan` ke `Sudah Diambil`
- **THEN** `tanggal_selesai` tetap bernilai waktu saat servis selesai dikerjakan

#### Scenario: Upaya mengisi manual
- **WHEN** kolom `tanggal_selesai` di-update langsung tanpa perubahan status
- **THEN** nilai `tanggal_selesai` tidak berubah

### Requirement: Servis yang sudah diambil terkunci
`layanan_service` berstatus `Sudah Diambil` MUST NOT dapat diubah, termasuk status dan field data lainnya. Setiap upaya update SHALL ditolak dengan error `SERVIS_TERKUNCI`.

#### Scenario: Mengubah status servis yang sudah diambil
- **WHEN** status `layanan_service` berstatus `Sudah Diambil` diubah ke `Selesai Dikerjakan`
- **THEN** database menolak dengan error `SERVIS_TERKUNCI`

#### Scenario: Mengedit data servis yang sudah diambil
- **WHEN** kolom `masalah` pada `layanan_service` berstatus `Sudah Diambil` diubah
- **THEN** database menolak dengan error `SERVIS_TERKUNCI`

### Requirement: Hapus layanan hanya saat Menunggu Antrian
Penghapusan baris `layanan_service` SHALL hanya diizinkan bila statusnya `Menunggu Antrian`. Penghapusan pada status lain MUST ditolak dengan error `HAPUS_TIDAK_DIIZINKAN`.

#### Scenario: Hapus servis yang belum diproses
- **WHEN** `layanan_service` berstatus `Menunggu Antrian` dihapus
- **THEN** baris beserta `riwayat_status`-nya terhapus

#### Scenario: Hapus servis yang sudah diproses
- **WHEN** `layanan_service` berstatus `Diperiksa` dihapus
- **THEN** database menolak dengan error `HAPUS_TIDAK_DIIZINKAN` dan baris tetap ada

### Requirement: RPC daftar_servis
Database SHALL menyediakan fungsi `daftar_servis(p_nomor_polisi, p_nama_pembawa, p_nomor_wa, p_jenis_motor, p_kilometer, p_masalah)` yang hanya dapat dieksekusi role `authenticated`. Dalam satu transaksi, fungsi ini:

- memvalidasi input;
- meng-upsert `pelanggan` berdasarkan nomor polisi ternormalisasi, dengan memperbarui `nama_pembawa` dan `nomor_wa`;
- membuat `layanan_service` dengan `service_advisor_id = auth.uid()`;
- mengembalikan id layanan baru.

Jika kendaraan masih punya servis aktif, fungsi MUST gagal dengan error `SERVIS_AKTIF_ADA` (detail berisi id servis aktif) tanpa mengubah data apa pun.

#### Scenario: Kendaraan baru
- **WHEN** SA memanggil `daftar_servis` dengan nopol `dc 1234 ab` yang belum pernah terdaftar
- **THEN** satu baris `pelanggan` dengan `nomor_polisi = 'DC1234AB'` dan satu `layanan_service` berstatus `Menunggu Antrian` terbentuk

#### Scenario: Kendaraan lama dengan kontak baru
- **WHEN** SA memanggil `daftar_servis` untuk nopol yang sudah ada di `pelanggan`, dengan servis sebelumnya `Sudah Diambil` dan nomor WA berbeda
- **THEN** tidak ada baris `pelanggan` baru, `pelanggan.nomor_wa` diperbarui, dan `layanan_service` baru merujuk ke pelanggan tersebut

#### Scenario: Kendaraan masih punya servis aktif
- **WHEN** SA memanggil `daftar_servis` untuk nopol yang servisnya masih `Dikerjakan`
- **THEN** fungsi gagal dengan `SERVIS_AKTIF_ADA`, detail berisi id servis aktif, dan kontak `pelanggan` tidak berubah

#### Scenario: Input tidak valid
- **WHEN** `daftar_servis` dipanggil dengan `nama_pembawa` kosong atau `nomor_wa` bukan nomor telepon
- **THEN** fungsi gagal dengan `DATA_TIDAK_VALID` yang menyebut field terkait

#### Scenario: Dipanggil tanpa login
- **WHEN** role `anon` memanggil `daftar_servis`
- **THEN** pemanggilan ditolak karena tidak punya izin eksekusi

### Requirement: RPC ubah_servis
Database SHALL menyediakan fungsi `ubah_servis(p_id, p_nomor_polisi, p_nama_pembawa, p_nomor_wa, p_jenis_motor, p_kilometer, p_masalah)` untuk role `authenticated`. Fungsi ini mengubah field data `layanan_service`, tetapi tidak mengubah status. Dalam satu transaksi:

- `nama_pembawa` dan `nomor_wa` SHALL juga diperbarui pada `pelanggan` terkait.
- Jika nomor polisi berubah, layanan SHALL dipindahkan ke `pelanggan` yang sesuai dengan nopol baru. Baris pelanggan dibuat bila belum ada.
- Baris `pelanggan` lama SHALL dihapus bila tidak lagi punya layanan.
- Fungsi MUST gagal dengan `SERVIS_TERKUNCI` untuk layanan `Sudah Diambil`.
- Fungsi MUST gagal dengan `SERVIS_AKTIF_ADA` bila nopol baru milik kendaraan yang sedang punya servis aktif lain.

#### Scenario: Edit masalah dan kilometer
- **WHEN** SA memanggil `ubah_servis` untuk layanan `Dikerjakan` dengan `masalah` dan `kilometer` baru
- **THEN** kedua kolom berubah, status tetap `Dikerjakan`, dan tidak ada baris `riwayat_status` baru

#### Scenario: Koreksi nopol salah ketik
- **WHEN** layanan terdaftar dengan nopol `DC1243AB` (pelanggan baru tanpa riwayat lain), lalu SA mengoreksinya menjadi `DC1234AB` yang sudah ada di `pelanggan`
- **THEN** layanan merujuk ke pelanggan `DC1234AB` dan baris pelanggan `DC1243AB` terhapus

#### Scenario: Kontak ikut diperbarui
- **WHEN** SA mengubah `nomor_wa` lewat `ubah_servis`
- **THEN** `layanan_service.nomor_wa` dan `pelanggan.nomor_wa` bernilai nomor baru

#### Scenario: Nopol tujuan punya servis aktif
- **WHEN** SA mengoreksi nopol ke kendaraan yang sedang punya servis `Diperiksa`
- **THEN** fungsi gagal dengan `SERVIS_AKTIF_ADA` dan tidak ada data yang berubah

### Requirement: RPC hapus_servis
Database SHALL menyediakan fungsi `hapus_servis(p_id)` untuk role `authenticated`. Fungsi ini menghapus `layanan_service` (tunduk pada aturan hapus hanya saat `Menunggu Antrian`) dan menghapus baris `pelanggan` terkait bila tidak lagi punya layanan. Fungsi MUST gagal dengan `SERVIS_TIDAK_DITEMUKAN` bila id tidak ada.

#### Scenario: Hapus servis kendaraan baru yang salah input
- **WHEN** SA menghapus satu-satunya layanan milik sebuah pelanggan, dan layanan itu masih `Menunggu Antrian`
- **THEN** layanan dan baris pelanggan tersebut terhapus

#### Scenario: Hapus servis kendaraan lama
- **WHEN** SA menghapus layanan `Menunggu Antrian` milik pelanggan yang punya riwayat servis lain
- **THEN** layanan terhapus dan baris pelanggan tetap ada
