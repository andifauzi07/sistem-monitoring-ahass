## Why

Pelanggan yang menitipkan sepeda motor di AHASS Kota Mamuju saat ini harus terus memantau halaman web atau menunggu tanpa kepastian kapan kendaraannya selesai dikerjakan. Sesuai roadmap pengembangan (`docs/PRD.md` Bagian 8.7 FR-7.4 dan Bagian 13 Iterasi 7), sistem membutuhkan notifikasi proaktif ke WhatsApp pelanggan segera setelah servis mencapai status `Selesai Dikerjakan`, sehingga pelanggan langsung mengetahui bahwa kendaraannya siap diambil tanpa perlu bolak-balik memeriksa status secara manual.

## What Changes

- **Integrasi WapiSender via Supabase Edge Function**: Menambahkan Supabase Edge Function `kirim-wa` yang menghubungkan sistem ke gateway WhatsApp pihak ketiga WapiSender (`wapisender.id`) menggunakan kredensial aman di server-side (Supabase Secrets).
- **Pemicu Otomatis Status Selesai**: Saat Service Advisor mengubah status layanan menjadi `Selesai Dikerjakan`, sistem memicu pengiriman notifikasi WhatsApp ke nomor pembawa/pelanggan.
- **Normalisasi Nomor Telepon**: Memastikan seluruh variasi format nomor WhatsApp pelanggan (mis. `08xx`, `+628xx`, `628xx`, spasi/tanda hubung) dinormalisasi ke standar internasional tanpa tanda tambah (`628xxxxxxxxxx`) sebelum dikirim ke gateway.
- **Template Pesan Resmi AHASS**: Format pesan WhatsApp memuat sapaan personal pelanggan, rincian kendaraan (tipe & nopol), keluhan, nama mekanik yang menangani, waktu selesai, tautan cek status mandiri, dan petunjuk pengambilan di kasir.
- **Tabel Audit `riwayat_notifikasi`**: Mencatat setiap upaya pengiriman (berhasil / gagal), isi pesan, nomor tujuan, serta respons atau kode error dari gateway untuk transparansi dan audit operasional.
- **Feedback UI & Tombol Kirim Ulang di Halaman SA**: Menampilkan status pengiriman notifikasi WhatsApp pada halaman Detail Servis serta menyediakan tombol cadangan manual **"Kirim Ulang WhatsApp"** bila pengiriman otomatis sempat gagal (mis. device WhatsApp bot sedang offline).

## Capabilities

### New Capabilities
- `whatsapp-notification`: Pengiriman pesan notifikasi WhatsApp resmi via gateway WapiSender saat servis selesai, pemformatan template pesan dinamis, normalisasi nomor telepon, dan pencatatan riwayat pengiriman notifikasi.

### Modified Capabilities
- `database-schema`: Penambahan tabel `riwayat_notifikasi` berelasi dengan `layanan_service` beserta kebijakan RLS dan fungsi terkait.
- `service-management`: Halaman Detail Servis SA menampilkan indikator status notifikasi WhatsApp dan menyediakan tombol aksi "Kirim Ulang WhatsApp".

## Impact

- **Backend / Supabase**:
  - Migrasi database baru `0006_riwayat_notifikasi.sql` untuk tabel `riwayat_notifikasi` dan RLS policy.
  - Supabase Edge Function baru `supabase/functions/kirim-wa/index.ts` dengan env secrets `WAPISENDER_API_KEY` dan `WAPISENDER_DEVICE_KEY`.
- **Frontend**:
  - Modul client helper baru untuk memanggil Edge Function `kirim-wa` dan membaca status riwayat notifikasi.
  - Pembaruan UI pada `ServisDetailPage.tsx` untuk menampilkan status notifikasi dan tombol kirim ulang.
  - Tipe TypeScript baru di `src/types/database.ts` untuk tabel `riwayat_notifikasi`.
- **Ketergantungan Eksternal**:
  - Akun dan perangkat aktif di platform WapiSender (`wapisender.id`).
- **Keamanan**:
  - Kredensial API WapiSender tidak terekspos ke bundle client browser.
