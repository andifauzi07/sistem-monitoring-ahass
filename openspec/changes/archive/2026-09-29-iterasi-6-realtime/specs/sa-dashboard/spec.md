## ADDED Requirements

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
