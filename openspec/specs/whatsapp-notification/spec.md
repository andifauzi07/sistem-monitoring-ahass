# whatsapp-notification Specification

## Purpose
Pengiriman notifikasi pesan WhatsApp ke pelanggan bengkel AHASS Kota Mamuju secara otomatis saat pengerjaan servis selesai (`Selesai Dikerjakan`) via gateway pihak ketiga WapiSender, termasuk normalisasi nomor telepon, penyusunan template resmi, dan pencatatan audit riwayat pengiriman.

## Requirements

### Requirement: Pengiriman notifikasi otomatis saat servis selesai
Sistem SHALL memicu pengiriman notifikasi WhatsApp ke nomor kontak pelanggan saat status `layanan_service` berhasil diubah menjadi `Selesai Dikerjakan`. Pengiriman MUST NOT dipicu pada perubahan status lainnya.

#### Scenario: Status dimajukan ke Selesai Dikerjakan
- **WHEN** Service Advisor memajukan status servis dari `Dikerjakan` ke `Selesai Dikerjakan` dan berhasil tersimpan
- **THEN** fungsi pengiriman notifikasi WhatsApp dipicu untuk layanan tersebut

#### Scenario: Perubahan ke status selain Selesai Dikerjakan
- **WHEN** Service Advisor memajukan status servis dari `Menunggu Antrian` ke `Diperiksa` atau dari `Diperiksa` ke `Dikerjakan`
- **THEN** sistem tidak memicu pengiriman notifikasi WhatsApp

### Requirement: Normalisasi nomor WhatsApp pelanggan
Sebelum mengirim pesan ke gateway, sistem SHALL menormalisasi nomor telepon pelanggan ke format nomor internasional tanpa tanda tambah (`628xxxxxxxxxx`). Karakter pemisah seperti spasi, tanda hubung (`-`), atau awalan `0` maupun `+62` MUST dikonversi secara konsisten.

#### Scenario: Nomor diawali dengan 08
- **WHEN** nomor WhatsApp pelanggan tercatat sebagai `081234567890`
- **THEN** sistem mengirim ke gateway dengan format nomor `6281234567890`

#### Scenario: Nomor menggunakan tanda hubung dan kode negara +62
- **WHEN** nomor WhatsApp pelanggan tercatat sebagai `+62 812-3456-7890`
- **THEN** sistem mengirim ke gateway dengan format nomor `6281234567890`

### Requirement: Template pesan resmi servis selesai
Pesan WhatsApp yang dikirimkan SHALL menggunakan template resmi AHASS Kota Mamuju yang mencakup nama pembawa, tipe motor, nomor polisi, keluhan awal, nama mekanik yang menangani (atau strip bila belum ada), waktu selesai, tautan cek status mandiri, serta arahan menuju kasir.

#### Scenario: Penyusunan template dengan mekanik yang ditugaskan
- **WHEN** motor Honda Vario nopol `DC1234AB` milik pembawa "Budi" selesai dikerjakan oleh mekanik "Agus"
- **THEN** pesan memuat sapaan Budi, nopol DC1234AB, nama mekanik Agus, status selesai, dan URL monitoring publik

### Requirement: Pemanggilan gateway WapiSender melalui Edge Function
Sistem SHALL mengeksekusi pengiriman pesan melalui Supabase Edge Function `kirim-wa`. Kredensial `api_key` dan `device_key` WapiSender MUST disimpan pada Secrets server dan MUST NOT dikirim atau diekspos ke klien browser.

#### Scenario: Pemanggilan sukses oleh Service Advisor
- **WHEN** Service Advisor terotentikasi memicu pengiriman notifikasi untuk ID layanan yang valid
- **THEN** Edge Function mengirim request HTTP POST ke endpoint WapiSender dengan kredensial server dan mengembalikan status keberhasilan

#### Scenario: Gateway WapiSender merespons error atau offline
- **WHEN** server WapiSender merespons status error atau koneksi device terputus
- **THEN** Edge Function menangkap error tersebut tanpa menyebabkan crash dan mengembalikan status gagal beserta keterangan pesan kesalahan

### Requirement: Pencatatan riwayat pengiriman notifikasi
Setiap upaya pengiriman notifikasi (baik berhasil maupun gagal) SHALL dicatat ke dalam tabel `riwayat_notifikasi` dengan kolom `layanan_service_id`, `nomor_tujuan`, `pesan`, `status` (`berhasil` atau `gagal`), `respons_gateway`, dan waktu pengiriman.

#### Scenario: Log pengiriman berhasil tercatat
- **WHEN** WapiSender menerima dan mengantrekan pesan dengan sukses
- **THEN** baris baru tersimpan di `riwayat_notifikasi` dengan status `berhasil` dan ID pesan dari WapiSender

#### Scenario: Log pengiriman gagal tercatat
- **WHEN** pengiriman ke WapiSender mengalami kegagalan (misal nomor tidak terdaftar di WA atau device offline)
- **THEN** baris baru tersimpan di `riwayat_notifikasi` dengan status `gagal` dan deskripsi error tersimpan pada kolom respons
