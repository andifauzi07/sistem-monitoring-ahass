## Context

Aplikasi Monitoring AHASS Kota Mamuju saat ini telah menyelesaikan Iterasi 0 s.d. Iterasi 6 (Realtime Update). Kendaraan yang diservis dapat dipantau oleh pelanggan secara live jika pelanggan membuka halaman publik dan memasukkan nomor polisi. Namun, sebagian besar pelanggan tidak selalu menatap layar monitor atau membuka browser ponsel mereka saat meninggalkan motor di bengkel.

Sesuai `docs/PRD.md` Bagian 8.7 (FR-7.4), Bagian 11, dan Bagian 13 (Iterasi 7), sistem membutuhkan notifikasi WhatsApp otomatis ke pelanggan saat kendaraan telah berstatus `Selesai Dikerjakan`. Pengiriman dilakukan melalui gateway pihak ketiga WapiSender (`wapisender.id`).

## Goals / Non-Goals

**Goals:**
- Mengirim notifikasi WhatsApp secara otomatis ke nomor telepon pembawa ketika Service Advisor memajukan status layanan menjadi `Selesai Dikerjakan`.
- Mengamankan kredensial WapiSender (`api_key` dan `device_key`) pada Supabase Edge Function (`supabase/functions/kirim-wa`), bukan di bundle frontend.
- Menormalisasi format nomor telepon pelanggan (misalnya `08xx`, `+62xx`, `0812-xxxx-xxxx`) menjadi format internasional tanpa tanda tambah (`628xxxxxxxxxx`).
- Menyusun template pesan resmi AHASS Kota Mamuju yang ramah, informatif, dan menyertakan tautan monitoring publik.
- Mencatat seluruh upaya pengiriman ke tabel audit `riwayat_notifikasi`.
- Menyediakan indikator status pengiriman (berhasil / gagal) dan tombol manual "Kirim Ulang WhatsApp" pada halaman Detail Servis SA.

**Non-Goals:**
- Tidak mengirim notifikasi pada transisi status selain `Selesai Dikerjakan` (misal saat baru masuk atau sedang dikerjakan).
- Tidak mengimplementasikan chatbot interaktif atau penanganan pesan masuk (inbound webhook / auto-reply pelanggan).
- Tidak mengintegrasikan provider selain WapiSender pada iterasi ini.

## Decisions

### 1. Arsitektur Pemanggilan: Supabase Edge Function (`kirim-wa`)
- **Pilihan Terpilih**: Client SA memanggil Supabase Edge Function `kirim-wa` setelah mutasi status ke `Selesai Dikerjakan` berhasil disimpan di database.
- **Alternatif yang Dipertimbangkan**:
  - *Direct HTTP dari Frontend Browser*: Ditolak karena membocorkan `api_key` dan `device_key` WapiSender ke publik melalui network tab / JavaScript bundle, serta potensi terhalang CORS.
  - *Database Webhook / PostgreSQL pg_net trigger*: Kurang fleksibel untuk memberikan umpan balik langsung (loading state, error notification) ke UI SA, dan memerlukan konfigurasi dashboard Supabase yang terpisah dari repo kode.
- **Rasional**: Supabase Edge Function dijalankan di environment Deno yang aman, memiliki akses ke Supabase Secrets, terproteksi JWT Service Advisor, dan dapat langsung mengembalikan status respons pengiriman ke UI SA.

### 2. Normalisasi Nomor Telepon
- **Pola Regex**: Membuang semua karakter non-angka (`[^0-9]`), kemudian jika diawali `0`, diubah menjadi `62`. Jika sudah diawali `62`, dipertahankan. Jika diawali `+62`, tanda `+` dibuang.
- **Validasi Minimum**: Memastikan nomor yang ternormalisasi memiliki panjang valid (antara 10 hingga 15 digit) sebelum request dikirimkan ke WapiSender.

### 3. Struktur Tabel Audit `riwayat_notifikasi`
```sql
create table public.riwayat_notifikasi (
  id uuid primary key default gen_random_uuid(),
  layanan_service_id uuid not null references public.layanan_service(id) on delete cascade,
  nomor_tujuan text not null,
  pesan text not null,
  status text not null check (status in ('berhasil', 'gagal')),
  respons_gateway text,
  id_pesan_gateway text,
  dibuat_pada timestamptz not null default now()
);
```
- Menambahkan indeks pada `layanan_service_id` untuk efisiensi query riwayat di halaman detail.
- RLS diaktifkan: hanya role `authenticated` yang dapat membaca (`select`) dan menyisipkan (`insert`).

### 4. Format Pesan WhatsApp Dinamis
Pesan disusun dengan struktur:
```text
AHASS KOTA MAMUJU

Yth. Bpk/Ibu {{nama_pembawa}},

Sepeda motor Anda Honda {{jenis_motor}} (No. Pol: {{nomor_polisi}}) telah SELESAI DIKERJAKAN di bengkel kami.

📋 Rincian Servis:
• Keluhan: {{masalah}}
• Mekanik: {{nama_mekanik}}
• Waktu Selesai: {{tanggal_selesai}}

Kendaraan Anda sudah siap untuk diambil. Silakan menuju bagian kasir/front desk untuk penyelesaian administrasi dan pengambilan unit kendaraan.

Tautan Monitoring Publik:
{{url_monitoring}}

Terima kasih atas kepercayaan Anda merawat sepeda motor Honda di AHASS Kota Mamuju.
```

### 5. Resiliensi dan Penanganan Gangguan Gateway
- Jika WapiSender merespons error (misal device bot WhatsApp sedang offline, kuota pesan habis, atau nomor tidak terdaftar), Edge Function mencatat baris `riwayat_notifikasi` berstatus `'gagal'` dengan pesan kesalahan lengkap.
- Transaksi status servis di database **tetap sah dan tidak di-rollback**, karena kegagalan jaringan pihak ketiga tidak boleh membatalkan fakta bahwa sepeda motor di bengkel memang sudah selesai dikerjakan.
- UI Service Advisor di `ServisDetailPage.tsx` mendeteksi status pengiriman terakhir dan menampilkan tombol **"Kirim Ulang WhatsApp"** agar SA dapat mencoba mengirim kembali saat kendala teratasi.

## Risks / Trade-offs

- **[Perangkat WhatsApp Bengkel Disconnected di WapiSender]** → Respons gateway akan ditangkap oleh Edge Function, dicatat sebagai `'gagal'`, dan UI SA menampilkan peringatan bahwa WhatsApp belum terkirim beserta tombol coba lagi.
- **[Nomor Pelanggan Salah / Tidak Terdaftar di WhatsApp]** → WapiSender mengembalikan status gagal, sistem mencatat pesan galat di `respons_gateway` tanpa mengganggu proses servis lainnya.
- **[Latensi Jaringan Gateway Eksternal]** → Panggilan Edge Function dilakukan secara asinkron atau dengan timeout wajar (10 detik) sehingga antarmuka Service Advisor tetap responsif.
- **[Pembatalan Status Melalui Undo Toast]** → Karena transisi ke `Selesai Dikerjakan` wajib melalui konfirmasi modal dialog (`ConfirmDialog`), tindakan ini bersifat sadar dan terencana. Jika SA membatalkan via Undo Toast, data riwayat notifikasi lama tetap menjadi arsip riwayat bahwa notifikasi pernah dikirim.

## Migration Plan

1. Buat file migrasi SQL `supabase/migrations/0006_riwayat_notifikasi.sql` yang mendefinisikan tabel `riwayat_notifikasi`, foreign key cascade, index, dan RLS policy.
2. Buat Edge Function di `supabase/functions/kirim-wa/index.ts` dengan logika normalisasi, template pesan, pemanggilan API WapiSender, dan pencatatan log ke Supabase.
3. Tambahkan environment secrets di Supabase Cloud: `WAPISENDER_API_KEY`, `WAPISENDER_DEVICE_KEY`, dan opsional `APP_PUBLIC_URL`.
4. Perbarui client helper dan UI `ServisDetailPage.tsx` untuk menampilkan status notifikasi dan tombol kirim ulang.
