## Why

Saat status servis diubah ke "Selesai Dikerjakan", sistem otomatis mengirimkan pesan WhatsApp ke pelanggan via Edge Function dan gateway WapiSender. Namun, selama proses pengiriman berlangsung (belum mengembalikan respons apapun), tombol "Kirim Ulang WhatsApp" di halaman detail langsung tampil dalam keadaan aktif. Celah waktu ini memungkinkan Service Advisor mengklik tombol secara berulang, mengakibatkan pengiriman pesan duplikat (spam) ke pelanggan, risiko nomor WhatsApp bengkel diblokir oleh sensor spam WhatsApp, dan pemborosan kuota WapiSender.

## What Changes

- **Pencegahan dan Penghilangan Tombol Saat In-Flight**: Tombol "Kirim Ulang WhatsApp" disembunyikan sama sekali dari DOM selama pengiriman pesan sedang berlangsung (baik pengiriman otomatis pertama maupun pengiriman ulang manual) dan belum ada respons kembali dari server.
- **Indikator Proses Pengiriman**: Sebagai pengganti tombol yang disembunyikan, ditampilkan indikator visual informatif (status loading dengan animasi spinner) yang menandakan bahwa pesan sedang dalam perjalanan ke gateway.
- **Zero-History Gate**: Tombol kirim ulang tidak akan pernah dirender jika belum ada riwayat notifikasi (`riwayatNotif.length === 0`), memastikan pengiriman otomatis pertama selesai tuntas sebelum opsi kirim ulang tersedia.
- **Unified Sending State**: Menghubungkan state pengiriman otomatis pada `useStatusFeedback` dengan komponen `ServisDetailPage` sehingga status pengiriman tersinkronisasi secara instan.

## Capabilities

### Modified Capabilities
- `service-management`: Penambahan aturan visibilitas dan pencegahan spam pada tombol aksi pengiriman ulang notifikasi WhatsApp di halaman detail servis.

## Impact

- `src/lib/useStatusFeedback.ts`: Penambahan event/callback indikasi awal pengiriman otomatis (`onNotifikasiMulai`) dan akhir pengiriman (`onNotifikasiSelesai`).
- `src/pages/ServisDetailPage.tsx`: Penggabungan state loading pengiriman (`isMengirim`), eliminasi tombol saat *in-flight*, dan penggantian tombol dengan badge progres pengiriman.
