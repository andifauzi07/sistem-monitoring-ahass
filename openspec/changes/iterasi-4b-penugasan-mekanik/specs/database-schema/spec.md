## ADDED Requirements

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
