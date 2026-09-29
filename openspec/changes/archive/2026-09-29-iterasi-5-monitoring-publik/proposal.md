## Why

Pelanggan belum bisa memantau status servis kendaraannya sendiri: halaman publik `/` masih placeholder dengan input nomor polisi yang dinonaktifkan. Padahal RPC publik `cek_status` sudah tersedia sejak Iterasi 0, sehingga Iterasi 5 (FR-7.1–7.2, `docs/PRD.md` Bagian 13) tinggal menghubungkan halaman publik ke RPC tersebut dengan query on-demand, tanpa realtime dan notifikasi WA.

## What Changes

- Mengaktifkan form pencarian di halaman publik `/`. Pelanggan memasukkan nomor polisi (FR-7.1), lalu input dinormalisasi dan divalidasi minimal 3 karakter sebelum `cek_status` dipanggil.
- Menampilkan hasil pencarian (FR-7.2):
  - **Kartu servis aktif**: nopol, jenis motor, stepper 5 tahap status, dan tanggal masuk (serta tanggal selesai bila ada).
  - **Riwayat kunjungan sebelumnya**: kolom No, No Polisi, Status Unit, dan tanggal; maksimal 5 entri, bisa dibuka-tutup.
  - Pesan khusus bila kendaraan terdaftar tetapi tidak ada servis yang sedang berjalan.
- Menangani state kosong, memuat, tidak ditemukan, input tidak valid, dan error jaringan (dengan tombol coba lagi).
- Nomor polisi yang dicari disimpan di URL sebagai `/?nopol=<NOPOL>`. Membuka URL tersebut langsung menjalankan pencarian, sehingga tautan bisa dibagikan dan nanti dipakai di pesan WA (Iterasi 7) maupun realtime (Iterasi 6).
- Membungkus pemanggilan RPC dalam satu fungsi `cekStatus(nopol)` di `src/lib/` dengan pola `Hasil<T>`, agar Iterasi 6 cukup memanggilnya ulang.
- **Dihapus**: komponen `src/components/ConnectionStatus.tsx` (indikator koneksi sisa Iterasi 0 yang sudah tidak dipakai di mana pun), beserta requirement "Pengecekan koneksi Supabase".
- Tidak ada migrasi database dan tidak ada perubahan pada RPC `cek_status`.

## Capabilities

### New Capabilities

- `public-monitoring`: halaman publik tanpa login untuk mencari servis berdasarkan nomor polisi dan menampilkan status servis aktif beserta riwayat kunjungan, termasuk sinkronisasi nopol dengan URL.

### Modified Capabilities

- `project-foundation`: rute `/` tidak lagi berupa placeholder (merujuk capability `public-monitoring`), dan requirement "Pengecekan koneksi Supabase" dihapus.

## Impact

- **Kode**: `src/pages/PublicMonitoringPage.tsx` (ditulis ulang), `src/lib/` (fungsi `cekStatus` baru dan pemetaan error), kemungkinan komponen baru untuk stepper status. `src/components/ConnectionStatus.tsx` dihapus.
- **Database / API**: tidak berubah. Tetap memakai RPC `cek_status(nopol)` yang sudah diizinkan untuk role `anon`. Kolom yang ditampilkan terbatas pada kolom tersanitasi (tanpa nama, WA, keluhan, kilometer, id, maupun mekanik).
- **Routing**: rute `/` tetap sama; ditambah query param opsional `nopol`.
- **Di luar scope**: realtime (Iterasi 6), notifikasi WhatsApp (Iterasi 7), nama mekanik, estimasi selesai, rate limiting.
