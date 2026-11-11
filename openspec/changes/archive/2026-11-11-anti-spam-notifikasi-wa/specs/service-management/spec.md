## MODIFIED Requirements

### Requirement: Aksi kirim ulang WhatsApp oleh Service Advisor
Halaman `/servis/:id` SHALL menyediakan tombol "Kirim Ulang WhatsApp" untuk servis berstatus `Selesai Dikerjakan` atau `Sudah Diambil` HANYA JIKA proses pengiriman tidak sedang berjalan dan minimal terdapat satu entri riwayat pengiriman sebelumnya (*Zero-History Gate*). Selama pengiriman berlangsung (baik pengiriman otomatis awal maupun pengiriman ulang manual) dan belum ada respons kembali dari server, tombol kirim ulang MUST NOT dirender di DOM dan SHALL digantikan oleh indikator proses pengiriman (badge loading animasi).

#### Scenario: SA menekan tombol kirim ulang
- **WHEN** SA menekan tombol "Kirim Ulang WhatsApp" pada servis yang sudah selesai dikerjakan dan telah memiliki riwayat pengiriman sebelumnya
- **THEN** tombol langsung hilang dari DOM digantikan indikator proses pengiriman, sistem memanggil fungsi pengiriman, dan setelah selesai menampilkan kembali tombol beserta status riwayat pengiriman yang diperbarui

#### Scenario: Tombol kirim ulang disembunyikan saat pengiriman in-flight
- **WHEN** pengiriman pesan sedang diproses oleh Edge Function dan belum mengembalikan status atau respons apapun (baik pemicuan otomatis status "Selesai Dikerjakan" maupun klik manual)
- **THEN** tombol "Kirim Ulang WhatsApp" tidak tampil di DOM dan pengguna melihat indikator proses "Sedang mengirim notifikasi WhatsApp ke pelanggan…"

#### Scenario: Tombol kirim ulang disembunyikan jika riwayat masih kosong (Zero-History Gate)
- **WHEN** servis berstatus "Selesai Dikerjakan" namun belum ada catatan riwayat notifikasi di database (`riwayatNotif.length === 0`)
- **THEN** tombol "Kirim Ulang WhatsApp" tidak ditampilkan di DOM
