## 1. Lapisan Data

- [x] 1.1 Buat `src/lib/cekStatus.ts`: fungsi `cekStatus(nopol: string): Promise<Hasil<HasilCekStatus[]>>` yang memanggil `supabase.rpc('cek_status', { nopol })`. Error dipetakan hanya ke `JARINGAN` (`MSG_JARINGAN`) atau `UMUM` (`MSG_UMUM`); jangan pakai `mapServisError` (design D1).
- [x] 1.2 Tambahkan helper murni untuk memisahkan hasil menjadi `aktif` (elemen pertama dengan `isAktif(status)`, atau `null`) dan `riwayat` (status `Sudah Diambil`, maksimal 5), sesuai design D5.

## 2. Komponen Stepper Status

- [x] 2.1 Buat `src/components/StatusStepper.tsx`: menerima `status: StatusServis` dan merender kelima tahap `STATUS_SERVIS` sebagai selesai, aktif, atau belum dilalui berdasarkan indeks. Tahap aktif diberi `aria-current="step"`, tahap selesai diberi ikon centang (lucide-react).
- [x] 2.2 Tata letak stepper vertikal di HP dan horizontal mulai breakpoint `sm`; label panjang ("Selesai Dikerjakan") tidak terpotong dan tidak memicu scroll horizontal.

## 3. Halaman Publik Monitoring

- [x] 3.1 `src/pages/PublicMonitoringPage.tsx`: aktifkan form (hapus `disabled` dan teks "Pencarian akan aktif pada iterasi berikutnya"). Input memakai `autoCapitalize="characters"`, `autoComplete="off"`, dan target sentuh ≥ 44 px.
- [x] 3.2 Jadikan URL sumber kebenaran (design D2): baca `nopol` dari `useSearchParams`. Submit yang valid memanggil `setSearchParams({ nopol })` dengan navigasi push. Bila nopol sama dengan yang sudah ada di URL, panggil `muatUlang()`. Sinkronkan nilai input dari URL saat param `nopol` berubah (Back/Forward).
- [x] 3.3 Validasi klien (design D3): tolak input yang kurang dari 3 karakter setelah `normalizeNopol`, tampilkan pesan inline, dan jangan ubah URL. Nilai `nopol` tidak valid dari URL juga menampilkan pesan validasi tanpa memanggil RPC.
- [x] 3.4 Pemuatan dengan `useMuat` (design D4): `loader` dibuat dengan `useCallback` bergantung pada nopol valid dari URL. Tanpa nopol valid, halaman berada di state kosong. Tombol "Cek Status" nonaktif dan ada indikator memuat selama permintaan berjalan.
- [x] 3.5 Kartu servis aktif: `formatNopol`, jenis motor, `StatusBadge`, `StatusStepper`, tanggal masuk, dan tanggal selesai bila ada (`formatTanggalWaktu`, WITA). Tambahkan keterangan "siap diambil" saat status `Selesai Dikerjakan`. Jangan tampilkan data selain kolom hasil `cek_status`.
- [x] 3.6 Riwayat kunjungan sebelumnya dalam `<details>`/`<summary>` "Kunjungan sebelumnya (n)" (design D7): kolom No, No Polisi, Status Unit, dan Tanggal masuk. Tertutup bila ada servis aktif, terbuka bila tidak ada. Tidak dirender bila riwayat kosong. Tidak ada scroll horizontal halaman di HP.
- [x] 3.7 Keadaan tanpa servis aktif: tampilkan keterangan "tidak ada servis yang sedang berjalan" untuk nopol tersebut, disusul riwayat.
- [x] 3.8 Keadaan tidak ditemukan (hasil kosong): pesan bahwa nopol belum terdaftar beserta saran memeriksa penulisan. Keadaan error: pesan dari `cekStatus` dan tombol "Coba lagi" yang memanggil `muatUlang()`.
- [x] 3.9 Tetap tampilkan daftar tahapan servis statis saat state kosong (belum mencari) sebagai panduan bagi pelanggan, atau ganti dengan `StatusStepper` tanpa status aktif. Pilih salah satu yang paling rapi.

## 4. Pembersihan

- [x] 4.1 Hapus `src/components/ConnectionStatus.tsx` dan pastikan tidak ada import yang tersisa (design D8).

## 5. Verifikasi Otomatis (Agent)

- [x] 5.1 Jalankan `npm run lint` dan pastikan lolos.
- [x] 5.2 Jalankan `npm run build` dan pastikan type-check serta build produksi sukses.

## 6. Tugas Pengguna (Bukan Agent)

- [x] 6.1 Uji manual di HP atau mode responsif browser (tanpa login):
  - cari nopol dengan format bebas (mis. `dc 1234-ab`);
  - input terlalu pendek harus ditolak;
  - nopol tidak terdaftar menampilkan pesan tidak ditemukan;
  - kendaraan dengan servis aktif: cek stepper di setiap status;
  - kendaraan yang hanya punya riwayat;
  - riwayat lebih dari 5 kunjungan hanya menampilkan 5;
  - buka `/?nopol=...` langsung, refresh, dan tombol Back;
  - matikan jaringan lalu tekan "Coba lagi".
- [x] 6.2 Pastikan tidak ada data pribadi (nama, WA, keluhan, kilometer, mekanik) yang tampil di halaman publik.
- [ ] 6.3 Commit perubahan.
