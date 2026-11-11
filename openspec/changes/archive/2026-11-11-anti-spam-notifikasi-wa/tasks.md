## 1. Integrasi Siklus Hidup Pengiriman pada Hook

- [x] 1.1 Tambahkan parameter callback `onNotifikasiMulai?: () => void` pada fungsi `useStatusFeedback` di `src/lib/useStatusFeedback.ts`.
- [x] 1.2 Panggil `onNotifikasiMulai?.()` sesaat sebelum memanggil `kirimNotifikasiWa(servis.id)` pada transisi status `Selesai Dikerjakan`.

## 2. Implementasi Proteksi & Indikator In-Flight di Halaman Detail

- [x] 2.1 Siapkan state `sedangKirimOtomatis` pada `src/pages/ServisDetailPage.tsx` yang diaktifkan oleh `onNotifikasiMulai` dan dinonaktifkan oleh `onNotifikasiSelesai`.
- [x] 2.2 Buat variabel terpadu `isSedangKirim = sedangKirimOtomatis || mengirimWa` sebagai sumber kebenaran status pengiriman aktif.
- [x] 2.3 Perbarui blok antarmuka notifikasi WhatsApp: ganti tombol "Kirim Ulang WhatsApp" dengan badge proses pengiriman (animasi spinner dan teks informatif) selama `isSedangKirim === true`.
- [x] 2.4 Terapkan aturan *Zero-History Gate*: tombol "Kirim Ulang WhatsApp" hanya dirender ketika `!isSedangKirim` dan riwayat notifikasi telah terisi (`riwayatNotif && riwayatNotif.length > 0`).

## 3. Verifikasi & Pengujian

- [x] 3.1 Jalankan `npx eslint src` dan `npm run build` untuk memverifikasi kebersihan kode dan kevalidan kompilasi TypeScript.
- [x] 3.2 Verifikasi bahwa tombol tidak muncul sama sekali saat transisi awal ke `Selesai Dikerjakan` hingga entri riwayat pertama berhasil dicatat.
- [x] 3.3 Verifikasi bahwa saat tombol manual diklik, tombol langsung hilang dari DOM dan berganti indikator loading sampai proses tuntas.
