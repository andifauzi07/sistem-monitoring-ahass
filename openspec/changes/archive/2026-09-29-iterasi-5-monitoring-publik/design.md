## Context

- RPC `cek_status(nopol)` sudah ada sejak Iterasi 0 (`supabase/migrations/0001_init_schema.sql`). RPC ini `SECURITY DEFINER`, boleh dieksekusi `anon`, menormalisasi input, menolak input kurang dari 3 karakter, hanya mencocokkan persis, dan mengembalikan maksimal 20 baris (`nomor_polisi`, `jenis_motor`, `status`, `tanggal_masuk`, `tanggal_selesai`) terurut dari `tanggal_masuk` terbaru. Tipe hasilnya sudah tersedia di `src/types/database.ts` sebagai `HasilCekStatus`.
- Keputusan DB yang sudah terkunci: maksimal satu servis aktif (≠ `Sudah Diambil`) per kendaraan. Artinya hasil `cek_status` berisi paling banyak satu servis aktif, sisanya riwayat.
- `src/pages/PublicMonitoringPage.tsx` saat ini placeholder dengan input nonaktif dan daftar tahapan statis.
- Helper yang bisa dipakai ulang: `normalizeNopol`/`formatNopol` (`src/lib/nopol.ts`), `formatTanggalWaktu` (WITA, `src/lib/format.ts`), `isAktif` dan `warnaStatus` (`src/lib/statusServis.ts`), `StatusBadge`, `useMuat` (`src/lib/useMuat.ts`), serta konstanta `MSG_JARINGAN`/`MSG_UMUM`.
- Pengguna halaman ini adalah pelanggan yang mayoritas mengakses dari HP (PRD Bagian 9), jadi desainnya mobile-first dan minim langkah.
- Role `anon` tidak punya akses tabel, sehingga realtime publik di Iterasi 6 tidak bisa memakai `postgres_changes`. Iterasi ini cukup menyiapkan struktur yang mudah dipanggil ulang.

## Goals / Non-Goals

**Goals:**
- Pelanggan dapat memasukkan nomor polisi dan melihat status servis terkini tanpa login (FR-7.1–7.2).
- Status aktif divisualisasikan sebagai stepper 5 tahap, dan riwayat kunjungan tetap menampilkan kolom FR-7.2.
- Nomor polisi tersimpan di URL agar tautan bisa dibagikan, halaman bisa di-refresh, dan tombol Back berfungsi.
- Akses data dibungkus dalam satu fungsi `cekStatus` agar Iterasi 6 tinggal memanggilnya ulang.
- Menghapus `ConnectionStatus.tsx` yang sudah tidak dipakai.

**Non-Goals:**
- Realtime atau polling (Iterasi 6) dan notifikasi WhatsApp (Iterasi 7).
- Perubahan RPC `cek_status` atau migrasi DB apa pun, termasuk menambah nama mekanik.
- Estimasi waktu selesai dan rate limiting.

## Decisions

### D1. Modul data `src/lib/cekStatus.ts` dengan pemetaan error sendiri
Modul ini berisi `cekStatus(nopol: string): Promise<Hasil<HasilCekStatus[]>>`, yang memanggil `supabase.rpc('cek_status', { nopol })`. Error dipetakan hanya ke dua kode, `JARINGAN` (memakai `MSG_JARINGAN`) atau `UMUM` (memakai `MSG_UMUM`), dengan tipe `Hasil` lokal yang polanya sama seperti modul lain.

- *Alternatif:* memakai `mapServisError`. Ditolak karena pesannya untuk SA (mis. "Jalankan migrasi 0002…") dan tidak pantas dilihat pelanggan.
- Fungsi ini tidak memvalidasi panjang input. Validasi dilakukan halaman (D3), sementara DB tetap menjadi lapisan pertahanan kedua.

### D2. URL sebagai sumber kebenaran pencarian
Nomor polisi aktif dibaca dari `useSearchParams().get('nopol')`, lalu dinormalisasi.
- Submit form yang valid memanggil `setSearchParams({ nopol: ternormalisasi })` dengan navigasi push (bukan replace), sehingga setiap pencarian masuk riwayat browser dan tombol Back kembali ke pencarian sebelumnya.
- Pencarian dijalankan dari nilai URL, bukan dari handler submit. Dengan begitu buka tautan langsung, refresh, Back/Forward, dan submit memakai satu jalur yang sama.
- Bila pelanggan mengirim ulang nopol yang sama dengan yang sudah ada di URL, URL tidak berubah. Dalam kasus ini halaman memanggil `muatUlang()` agar data tetap diambil ulang.
- Nilai input dikendalikan state lokal dan disinkronkan ulang dari URL setiap kali param `nopol` berubah (mis. saat Back), supaya input selalu menampilkan nopol yang hasilnya sedang terlihat.
- *Alternatif:* state lokal saja, dengan URL diperbarui sebagai efek samping. Ditolak karena jalur Back/refresh jadi terpisah dari jalur submit dan rawan tidak sinkron.

### D3. Validasi di klien sebelum RPC
Input dianggap valid bila `normalizeNopol(input).length >= 3`, sama dengan aturan di `cek_status`. Input yang tidak valid menampilkan pesan inline di bawah input dan URL tidak diubah. Nilai `nopol` tidak valid yang datang dari URL juga menampilkan pesan validasi yang sama tanpa memanggil RPC.

### D4. Pemuatan memakai `useMuat`
`loader` dibuat dengan `useCallback` bergantung pada nopol dari URL. Kalau tidak ada nopol valid, halaman berada di state kosong (awal) dan RPC tidak dipanggil. Pola ini sama dengan halaman SA dan memberi `muatUlang()` gratis, yang nanti bisa dipakai Iterasi 6 (polling atau refresh saat tab aktif) tanpa merombak halaman.

### D5. Pemisahan hasil: servis aktif dan riwayat
Dari array hasil yang sudah terurut terbaru:
- `aktif` adalah elemen pertama dengan `isAktif(status)`. Paling banyak ada satu, sesuai constraint DB.
- `riwayat` adalah elemen berstatus `Sudah Diambil`, diambil maksimal 5 (`slice(0, 5)`).

Ada empat keadaan tampilan: kosong (belum mencari), memuat, error (dengan "Coba lagi" yang memanggil `muatUlang`), dan hasil. Keadaan hasil dibagi lagi menjadi tidak ditemukan (array kosong), aktif + riwayat, atau hanya riwayat (pesan "tidak ada servis yang sedang berjalan").

### D6. Komponen `StatusStepper`
Komponen presentasional baru `src/components/StatusStepper.tsx` menerima `status: StatusServis` dan merender `STATUS_SERVIS` sebagai tahapan selesai, aktif, atau belum dilalui berdasarkan indeks.
- Tata letaknya vertikal di HP (label panjang seperti "Selesai Dikerjakan" tetap terbaca) dan horizontal mulai breakpoint `sm`.
- Tahap aktif ditandai dengan `aria-current="step"`. Warnanya memakai palet brand/Tailwind yang sudah ada, dan tahap selesai diberi ikon centang (lucide-react sudah menjadi dependency).
- *Alternatif:* hanya menampilkan `StatusBadge`. Ditolak karena pelanggan tidak mendapat gambaran berapa tahap lagi yang tersisa.

### D7. Riwayat kunjungan bisa dibuka-tutup dengan `<details>`
Riwayat dibungkus elemen `<details>`/`<summary>` bawaan HTML, dengan label "Kunjungan sebelumnya (n)". Elemen ini sudah aksesibel lewat keyboard dan screen reader tanpa state tambahan. Isinya berupa daftar atau tabel dengan kolom No, No Polisi, Status Unit (`StatusBadge`), dan Tanggal masuk. Di HP tabelnya harus tetap muat tanpa scroll horizontal halaman, misalnya dengan menyembunyikan kolom kurang penting atau memakai tata letak kartu.
- Default: tertutup bila ada servis aktif, terbuka bila tidak ada servis aktif (riwayat menjadi satu-satunya isi).

### D8. Hapus `ConnectionStatus.tsx`
Komponen ini tidak di-import di mana pun. Requirement "Pengecekan koneksi Supabase" di `project-foundation` dihapus lewat delta spec. Peringatan env yang tidak lengkap tetap ditangani banner di `Layout`.

## Risks / Trade-offs

- **[Enumerasi nopol oleh pihak luar]** → Nopol memang terpampang di plat, RPC hanya mencocokkan persis dengan minimal 3 karakter, dan kolom yang dikembalikan sudah tersanitasi. Rate limiting berada di luar scope MVP.
- **[Nopol tercatat di riwayat browser atau pratinjau tautan]** → Risikonya dapat diterima karena yang terlihat hanya status dan jenis motor, tanpa data pribadi.
- **[Data tidak otomatis diperbarui]** → Sesuai scope Iterasi 5 (on-demand). Pelanggan bisa menekan "Cek Status" lagi atau refresh. Realtime dikerjakan di Iterasi 6.
- **[Submit nopol yang sama tidak mengubah URL]** → Ditangani dengan memanggil `muatUlang()` (D2).
- **[Tampilan jam pada kartu]** → Semua waktu memakai `formatTanggalWaktu` (WITA) agar konsisten dengan halaman SA.

## Migration Plan

Tidak ada migrasi DB. Perubahan frontend saja: build, lalu deploy seperti biasa. Rollback cukup dengan revert commit.

## Open Questions

Tidak ada. Keputusan tampilan (Opsi B), `?nopol=` di URL, dan penghapusan `ConnectionStatus.tsx` sudah dikonfirmasi pengguna.
