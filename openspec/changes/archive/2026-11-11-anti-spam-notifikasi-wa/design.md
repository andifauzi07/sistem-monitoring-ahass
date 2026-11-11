## Context

Saat Service Advisor memajukan status kendaraan ke `Selesai Dikerjakan`, `useStatusFeedback` memicu pemanggilan asinkron `kirimNotifikasiWa(servis.id)` di latar belakang dan segera memanggil `muatUlang()`. Data servis diperbarui di layar, namun Edge Function dan API WapiSender masih membutuhkan 2–10 detik untuk menyelesaikan pengiriman dan mencatat baris di tabel `riwayat_notifikasi`.

Selama jendela waktu *in-flight* ini, `ServisDetailPage` sebelumnya langsung merender tombol "Kirim Ulang WhatsApp" dalam status aktif karena state lokal `mengirimWa` bernilai `false`. Hal ini memungkinkan SA mengklik tombol tersebut sebelum pengiriman pertama tuntas, memicu duplikasi pesan ke pelanggan dan membebani kuota gateway WapiSender.

## Goals / Non-Goals

**Goals:**
- Menghilangkan tombol "Kirim Ulang WhatsApp" sepenuhnya dari DOM selama pesan sedang diproses dan belum mengembalikan respons / status apapun.
- Menggantikan posisi tombol dengan indikator proses pengiriman yang jelas (spinner animasi dan pesan kontekstual).
- Memastikan tombol kirim ulang tidak pernah muncul jika riwayat pengiriman masih kosong (*Zero-History Gate*).
- Menyatukan state pengiriman antara `useStatusFeedback` (otomatis) dan `handleKirimUlangWa` (manual) pada `ServisDetailPage`.

**Non-Goals:**
- Mengubah skema tabel atau migrasi database `riwayat_notifikasi`.
- Mengubah endpoint eksternal WapiSender atau struktur pesan yang disusun oleh Edge Function.
- Menambahkan sistem antrean pesan kustom baru di luar mekanisme yang sudah disediakan WapiSender.

## Decisions

### 1. Callback Siklus Hidup Pengiriman pada `useStatusFeedback`
Menambahkan callback opsional `onNotifikasiMulai?: () => void` ke dalam parameter `useStatusFeedback`:
```ts
export function useStatusFeedback(
  muatUlang: () => void,
  onNotifikasiSelesai?: (hasil: Hasil<HasilKirimWa>) => void,
  onNotifikasiMulai?: () => void,
)
```
Tepat sebelum `kirimNotifikasiWa(servis.id)` dipanggil saat status beralih ke `Selesai Dikerjakan`, `onNotifikasiMulai?.()` dipanggil untuk memberi sinyal ke komponen bahwa proses pengiriman telah dimulai.

*Alternatif dipertimbangkan:*
- Mengelola state sepenuhnya di dalam hook dan mengembalikan nilai boolean `sedangKirimWa`. Dipilih callback fleksibel agar `ServisDetailPage` tetap memiliki kendali penuh atas umpan balik UI lokalnya.

### 2. Aturan Rendering Tombol di `ServisDetailPage` (Opsi A + Opsi B)
Menggabungkan state pengiriman:
```ts
const sedangMemprosesWa = sedangKirimOtomatis || mengirimWa
```
Aturan render tombol:
- Jika `sedangMemprosesWa === true`: Tampilkan komponen badge loading (`LoaderCircle` + pesan "Sedang mengirim notifikasi WhatsApp ke pelanggan…"). Tombol kirim ulang ditiadakan dari DOM.
- Jika `sedangMemprosesWa === false` dan `riwayatNotif.length > 0`: Tampilkan tombol "Kirim Ulang WhatsApp".
- Jika `sedangMemprosesWa === false` dan `riwayatNotif.length === 0`: Tombol tidak ditampilkan (Zero-History Gate), mencegah interaksi manual sebelum pengiriman pertama selesai dicatat.

### 3. Keamanan Pasca-Refresh Halaman
Jika pengguna merefresh browser di tengah proses in-flight, `sedangKirimOtomatis` di memori akan reset. Namun karena `riwayatNotif` masih bernilai kosong (`length === 0`), Zero-History Gate memastikan tombol kirim ulang tetap tidak muncul sampai record pertama berhasil disimpan dan diterima melalui Supabase Realtime.

## Risks / Trade-offs

- **[Jaringan Sangat Lambat / Edge Function Timeout]** → Jika request Edge Function gagal atau timeout setelah 30 detik, callback `onNotifikasiSelesai` akan mematikan state `sedangMemprosesWa` dan menampilkan pesan galat, sehingga tombol "Coba Kirim Ulang" baru muncul untuk memungkinkan SA mencoba kembali.
- **[Akses Bersamaan Multi-Tab]** → Realtime subscription pada tabel `riwayat_notifikasi` memastikan begitu hasil pengiriman dicatat oleh tab manapun, daftar riwayat terisi dan UI langsung terbarui di semua tab aktif.
