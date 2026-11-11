# service-management Specification (Delta)

## ADDED Requirements

### Requirement: Tampilan status notifikasi WhatsApp di detail servis
Halaman `/servis/:id` SHALL menampilkan informasi status pengiriman notifikasi WhatsApp terakhir untuk layanan yang sedang dibuka (termasuk status berhasil/gagal dan waktu kirim), khususnya saat layanan telah mencapai status `Selesai Dikerjakan` atau `Sudah Diambil`.

#### Scenario: Notifikasi berhasil terkirim ditampilkan
- **WHEN** SA membuka detail servis yang notifikasinya telah berhasil dikirim ke pelanggan
- **THEN** halaman menampilkan tanda status WhatsApp berhasil terkirim beserta waktu pengiriman

#### Scenario: Notifikasi gagal dikirim ditampilkan
- **WHEN** SA membuka detail servis yang pengiriman notifikasinya mengalami kegagalan
- **THEN** halaman menampilkan tanda peringatan pengiriman WhatsApp gagal beserta keterangan kesalahan singkat

### Requirement: Aksi kirim ulang WhatsApp oleh Service Advisor
Halaman `/servis/:id` SHALL menyediakan tombol "Kirim Ulang WhatsApp" untuk servis berstatus `Selesai Dikerjakan` atau `Sudah Diambil`. Menekan tombol ini SHALL memicu pengiriman ulang notifikasi WhatsApp melalui Edge Function dan memperbarui riwayat notifikasi di layar.

#### Scenario: SA menekan tombol kirim ulang
- **WHEN** SA menekan tombol "Kirim Ulang WhatsApp" pada servis yang sudah selesai dikerjakan
- **THEN** sistem memicu pengiriman notifikasi, menampilkan indikator proses, dan memperbarui status riwayat pengiriman setelah selesai

#### Scenario: Tombol kirim ulang dinonaktifkan saat memproses
- **WHEN** permintaan pengiriman ulang sedang berjalan
- **THEN** tombol berada dalam status dinonaktifkan untuk mencegah klik ganda
