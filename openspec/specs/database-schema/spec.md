# database-schema Specification

## Purpose
Skema PostgreSQL/Supabase untuk seluruh entitas sistem monitoring servis AHASS (PRD Bagian 7): enum status servis, tabel inti, constraint, trigger log, dan Row Level Security.
## Requirements
### Requirement: Enum status servis
Database SHALL mendefinisikan tipe enum `status_servis` dengan nilai berurutan: `Menunggu Antrian`, `Diperiksa`, `Dikerjakan`, `Selesai Dikerjakan`, `Sudah Diambil`. Kolom `layanan_service.status` MUST bertipe enum ini dengan default `Menunggu Antrian`.

#### Scenario: Nilai status valid
- **WHEN** status sebuah `layanan_service` berstatus `Diperiksa` diubah menjadi `Dikerjakan`
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

### Requirement: Validasi penugasan mekanik
Perubahan `layanan_service.mekanik_id` SHALL ditolak oleh database bila mekanik baru bukan `is_active = true` dan `status_hadir = true`, atau bila `old.status` adalah `Selesai Dikerjakan` atau `Sudah Diambil`. Aturan ini MUST ditegakkan oleh database sehingga berlaku untuk semua jalur akses, mengikuti pola trigger `trg_aturan_layanan` untuk transisi status.

#### Scenario: Tugaskan ke mekanik yang aktif dan hadir
- **WHEN** `mekanik_id` sebuah servis berstatus `Diperiksa` diubah ke mekanik dengan `is_active = true` dan `status_hadir = true`
- **THEN** perubahan tersimpan

#### Scenario: Tugaskan ke mekanik yang tidak hadir
- **WHEN** `mekanik_id` sebuah servis diubah ke mekanik dengan `is_active = true` tapi `status_hadir = false`
- **THEN** database menolak dan `mekanik_id` tidak berubah

#### Scenario: Tugaskan ke mekanik nonaktif
- **WHEN** `mekanik_id` sebuah servis diubah ke mekanik dengan `is_active = false`
- **THEN** database menolak dan `mekanik_id` tidak berubah

#### Scenario: Ubah penugasan pada servis selesai dikerjakan
- **WHEN** `mekanik_id` sebuah servis berstatus `Selesai Dikerjakan` dicoba diubah
- **THEN** database menolak dan `mekanik_id` tidak berubah

### Requirement: Log penugasan mekanik otomatis
Setiap kali `layanan_service.mekanik_id` berubah nilai menjadi tidak null (baik dari `null` maupun dari mekanik lain), sistem SHALL otomatis mencatat satu baris `riwayat_penugasan_mekanik` (`mekanik_id` = nilai baru, `ditugaskan_oleh = auth.uid()`, `waktu = now()`). Perubahan kolom lain tanpa perubahan `mekanik_id` MUST NOT membuat baris log ini.

#### Scenario: Penugasan pertama
- **WHEN** `mekanik_id` sebuah servis berubah dari `null` menjadi id mekanik tertentu
- **THEN** satu baris `riwayat_penugasan_mekanik` dengan `mekanik_id` tersebut tercatat

#### Scenario: Reassign
- **WHEN** `mekanik_id` sebuah servis berubah dari satu mekanik ke mekanik lain
- **THEN** satu baris `riwayat_penugasan_mekanik` baru dengan `mekanik_id` mekanik yang baru tercatat

#### Scenario: Kolom lain berubah tanpa mengubah mekanik_id
- **WHEN** kolom `masalah` pada `layanan_service` diubah tanpa menyertakan perubahan `mekanik_id`
- **THEN** tidak ada baris `riwayat_penugasan_mekanik` baru

### Requirement: Wajib mekanik sebelum status Diperiksa
Perubahan `layanan_service.status` dari `Menunggu Antrian` menjadi `Diperiksa` SHALL ditolak selama `mekanik_id` baris tersebut masih `null`. Aturan ini MUST ditegakkan oleh database sehingga berlaku untuk semua jalur akses (halaman Daftar Servis maupun Detail Servis memakai kode yang sama, tapi trigger memastikan berlaku juga bila diakses lewat jalur lain).

#### Scenario: Maju ke Diperiksa tanpa mekanik
- **WHEN** status sebuah servis `Menunggu Antrian` dengan `mekanik_id = null` diubah menjadi `Diperiksa`
- **THEN** database menolak dengan error `MEKANIK_BELUM_DITUGASKAN` dan status tidak berubah

#### Scenario: Maju ke Diperiksa setelah mekanik ditugaskan
- **WHEN** status sebuah servis `Menunggu Antrian` yang `mekanik_id`-nya sudah terisi diubah menjadi `Diperiksa`
- **THEN** perubahan tersimpan

#### Scenario: Transisi lain tidak terpengaruh
- **WHEN** status sebuah servis `Dikerjakan` (dengan atau tanpa `mekanik_id`) diubah menjadi `Selesai Dikerjakan`
- **THEN** perubahan tersimpan tanpa syarat mekanik

### Requirement: Cegah nonaktifkan mekanik yang masih bertugas
Perubahan `mekanik.is_active` menjadi `false` SHALL ditolak bila terdapat baris `layanan_service` dengan `mekanik_id` mekanik tersebut dan `status` selain `Sudah Diambil`.

#### Scenario: Mekanik masih punya servis aktif
- **WHEN** `is_active` sebuah mekanik yang `mekanik_id`-nya dirujuk oleh servis berstatus `Dikerjakan` diubah menjadi `false`
- **THEN** database menolak dan `is_active` tetap `true`

#### Scenario: Mekanik tidak punya servis aktif
- **WHEN** `is_active` sebuah mekanik yang tidak dirujuk `mekanik_id` manapun berstatus selain `Sudah Diambil` diubah menjadi `false`
- **THEN** perubahan tersimpan
