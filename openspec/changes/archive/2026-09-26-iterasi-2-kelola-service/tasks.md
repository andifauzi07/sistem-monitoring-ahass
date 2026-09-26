## 1. Migrasi Database (`supabase/migrations/0002_kelola_service.sql`)

- [x] 1.1 Buat fungsi trigger `public.aturan_layanan_service()` (`plpgsql`, `set search_path = ''`) sesuai design D1:
  - INSERT wajib `Menunggu Antrian` dan `tanggal_selesai := null`;
  - UPDATE pada `Sudah Diambil` ditolak dengan `SERVIS_TERKUNCI`;
  - perubahan status wajib ±1 posisi enum, selain itu `TRANSISI_STATUS_TIDAK_VALID`;
  - `tanggal_selesai` diisi saat `Dikerjakan → Selesai Dikerjakan`, dikosongkan saat `Selesai Dikerjakan → Dikerjakan`, selain itu mempertahankan `old.tanggal_selesai`.

  Pasang sebagai `trg_aturan_layanan` (`before insert or update`) dengan pola `drop trigger if exists`.

- [x] 1.2 Buat fungsi trigger `public.cegah_hapus_layanan()` dan trigger `trg_cegah_hapus_layanan` (`before delete`) yang menolak dengan `HAPUS_TIDAK_DIIZINKAN` bila status bukan `Menunggu Antrian`.
- [x] 1.3 Buat RPC `public.daftar_servis(...) returns uuid` (`security invoker`) sesuai design D3/D4:
  - validasi `DATA_TIDAK_VALID` dengan nama field di `detail`;
  - pengecekan servis aktif (`SERVIS_AKTIF_ADA`, `detail` = id servis aktif);
  - upsert `pelanggan`;
  - insert layanan dengan `service_advisor_id = auth.uid()`;
  - `unique_violation` dipetakan ke `SERVIS_AKTIF_ADA`.
- [x] 1.4 Buat RPC `public.ubah_servis(p_id, ...) returns void`:
  - `select … for update`;
  - `SERVIS_TIDAK_DITEMUKAN` / `SERVIS_TERKUNCI`;
  - validasi;
  - perbarui kontak `pelanggan` atau pindah `pelanggan` saat nopol berubah;
  - update layanan tanpa menyentuh status;
  - `unique_violation` dipetakan ke `SERVIS_AKTIF_ADA`;
  - hapus `pelanggan` lama yang sudah tidak punya layanan.
- [x] 1.5 Buat RPC `public.hapus_servis(p_id) returns void`: hapus layanan (`SERVIS_TIDAK_DITEMUKAN` bila tidak ada baris), lalu hapus `pelanggan` yang sudah tidak punya layanan.
- [x] 1.6 Tambahkan `revoke all … from public, anon` pada kelima fungsi baru. Tambahkan `grant execute … to authenticated` hanya pada tiga RPC. Pastikan file bisa dijalankan ulang tanpa error.
- [x] 1.7 Perbarui `src/types/database.ts`: tambahkan `daftar_servis`, `ubah_servis`, `hapus_servis` di `Functions` (Args berawalan `p_`), dan ubah komentar rujukan migrasi.

## 2. Dokumentasi Database & PRD

- [x] 2.1 Perbarui `supabase/README.md`:
  - langkah menjalankan `0002_kelola_service.sql` setelah `0001`;
  - query verifikasi, termasuk transisi lompat ditolak, update `Sudah Diambil` ditolak, hapus non-`Menunggu Antrian` ditolak, dan `tanggal_selesai` terisi/terkosongkan;
  - baris ringkasan objek untuk trigger dan RPC baru;
  - snippet rollback.
- [x] 2.2 Perbarui `docs/PRD.md`:
  - Bagian 8.3: FR-3.2 menjadi "Edit Layanan Service", FR-3.3 menjadi "Ubah Status Service" (maju/mundur satu langkah, `tanggal_selesai` saat `Selesai Dikerjakan`, `Sudah Diambil` final), tambah FR-3.5 "Hapus Layanan Service" (hanya saat `Menunggu Antrian`);
  - Bagian 13 Iterasi 2 menjadi FR-3.1 – FR-3.5.

## 3. Lapisan Data & Helper Frontend

- [x] 3.1 Buat `src/lib/statusServis.ts` berisi:
  - `statusBerikutnya`, `statusSebelumnya`;
  - `perluKonfirmasi(tujuan)` (true untuk `Selesai Dikerjakan` dan `Sudah Diambil`);
  - `bisaDibatalkan(tujuan)` (false untuk `Sudah Diambil`);
  - `isAktif`;
  - kelas warna badge per status.
- [x] 3.2 Buat `src/lib/format.ts` untuk tanggal dan waktu WITA (`Asia/Makassar`, `id-ID`) serta kilometer dengan pemisah ribuan.
- [x] 3.3 Buat `src/lib/servisValidation.ts`, validasi form yang setara dengan design D4, termasuk pembersihan nomor WA dan panjang nopol ternormalisasi. Fungsi ini mengembalikan error per field.
- [x] 3.4 Buat `src/lib/servisErrors.ts` yang memetakan `PostgrestError` dan error jaringan ke pesan Bahasa Indonesia sesuai tabel design D2. Termasuk:
  - `23505` pada index `layanan_service_satu_aktif_per_pelanggan`;
  - fungsi RPC tidak ditemukan (migrasi belum dijalankan);
  - id servis aktif dari `details`.
- [x] 3.5 Buat `src/lib/servis.ts` berisi fungsi bertipe:
  - `ambilServisAktif`;
  - `ambilServis(id)`, dengan embed riwayat dan nama SA;
  - `cariKendaraan(nopol)`: pelanggan, jenis motor terakhir, dan servis aktif;
  - `daftarServis`, `ubahServis`, `hapusServis` (RPC);
  - `ubahStatus(id, dari, ke)`: update bersyarat `.eq('status', dari)` yang membedakan hasil 0 baris sebagai "status sudah berubah".

## 4. Komponen Bersama

- [x] 4.1 `src/components/StatusBadge.tsx`.
- [x] 4.2 `src/components/ConfirmDialog.tsx` memakai `<dialog>` native dengan `showModal()`. Mendukung judul, isi, label tombol, varian bahaya, dan status memproses.
- [x] 4.3 `src/components/UndoToast.tsx` dan hook `useUndoToast`:
  - tampil ±5 detik, dengan tombol "Batalkan" opsional;
  - `role="status"`;
  - timer dibersihkan saat unmount atau saat toast diganti.
- [x] 4.4 `src/components/StatusActionButton.tsx`:
  - label "→ ⟨tujuan⟩";
  - membuka konfirmasi bila perlu;
  - nonaktif selama permintaan berjalan;
  - minimal `min-h-11`.
- [x] 4.5 `src/components/ServisForm.tsx` (mode tambah dan edit):
  - enam field dengan `autoCapitalize="characters"` (nopol, beserta pratinjau `formatNopol`), `inputMode="tel"` (WA), `inputMode="numeric"` (kilometer), dan `textarea` (masalah);
  - error per field;
  - area error umum `role="alert"`;
  - tombol simpan nonaktif saat memproses.

## 5. Halaman & Routing

- [x] 5.1 `src/pages/ServisListPage.tsx`:
  - daftar servis aktif urut `tanggal_masuk` naik;
  - pencarian nopol (dinormalisasi) dan chip filter status;
  - tombol "Servis Baru" dan "Muat ulang";
  - refetch saat `visibilitychange`;
  - kartu di portrait/`md`, tabel ringkas di `lg`;
  - `StatusActionButton` per item beserta toast batal;
  - keadaan memuat, kosong, dan error.
- [x] 5.2 `src/pages/ServisBaruPage.tsx`:
  - `ServisForm` mode tambah;
  - isi otomatis lewat `cariKendaraan` (debounce ±400 ms atau blur, hanya mengisi field kosong);
  - peringatan servis aktif dengan tautan;
  - setelah sukses, navigasi ke `/servis/:id`.
- [x] 5.3 `src/pages/ServisDetailPage.tsx`:
  - data lengkap dan linimasa riwayat (status, waktu WITA, nama SA);
  - tombol maju dengan toast batal;
  - "Kembalikan ke ⟨sebelumnya⟩" dengan konfirmasi;
  - "Edit";
  - "Hapus" (hanya `Menunggu Antrian`, konfirmasi menyebut nopol, lalu ke `/servis`);
  - read-only untuk `Sudah Diambil`;
  - "Servis tidak ditemukan".
- [x] 5.4 `src/pages/ServisEditPage.tsx`:
  - `ServisForm` mode edit terisi data saat ini, disimpan via `ubahServis`, lalu kembali ke detail;
  - pesan terkunci untuk `Sudah Diambil`;
  - pesan tidak ditemukan.
- [x] 5.5 Tambahkan rute `servis`, `servis/baru`, `servis/:id`, dan `servis/:id/edit` sebagai child `RequireAuth` di `src/router.tsx`.
- [x] 5.6 Tambahkan `NavLink` "Servis" di antara "Dashboard" dan "Keluar" pada `src/components/Layout.tsx` (target sentuh ≥ 44 px). Tambahkan tautan ke `/servis` di placeholder `src/pages/DashboardPage.tsx`.

## 6. Verifikasi Otomatis (agent)

- [x] 6.1 `npm run build` lolos tanpa error.
- [x] 6.2 `npm run lint` lolos tanpa error.

## 7. Migrasi & Uji Manual (dilakukan pengguna)

- [x] 7.1 Jalankan `0002_kelola_service.sql` di Supabase SQL Editor, lalu jalankan query verifikasi di README. Semua penolakan harus muncul sesuai harapan.
- [x] 7.2 Tambah servis untuk nopol baru (mis. `dc 1234 ab`). Pastikan tersimpan sebagai `DC1234AB` berstatus `Menunggu Antrian`, lalu diarahkan ke detail.
- [x] 7.3 Tambah servis kedua untuk nopol yang sama. Pastikan peringatan servis aktif muncul saat mengetik nopol, dan simpan ditolak dengan tautan ke servis aktif.
- [x] 7.4 Majukan status sampai `Sudah Diambil`, lalu daftarkan ulang nopol tersebut. Pastikan nama, WA, dan jenis motor terisi otomatis, sedangkan kilometer dan masalah kosong.
- [x] 7.5 Majukan status dari daftar, lalu tekan "Batalkan" di toast. Pastikan status kembali. Tunggu 5 detik tanpa menekan apa pun, dan pastikan status tetap.
- [x] 7.6 Uji langkah ke `Selesai Dikerjakan`: konfirmasi muncul dan tanggal selesai tampil. Lalu "Kembalikan ke Dikerjakan": tanggal selesai hilang.
- [x] 7.7 Uji `Sudah Diambil`: konfirmasi final, tanpa tombol Batalkan, servis hilang dari daftar, dan detail read-only. Buka `/servis/<id>/edit` untuk servis ini dan pastikan muncul pesan terkunci.
- [x] 7.8 Edit servis aktif (kilometer, masalah, nomor WA). Pastikan detail berubah, status tetap, dan `pelanggan.nomor_wa` ikut berubah (cek di Table Editor).
- [x] 7.9 Koreksi nopol salah ketik di edit. Pastikan detail menampilkan nopol baru dan baris `pelanggan` salah ketik terhapus (cek di Table Editor).
- [x] 7.10 Hapus servis `Menunggu Antrian` (dengan konfirmasi). Pastikan kembali ke daftar. Untuk servis `Diperiksa`, pastikan tombol Hapus tidak ada.
- [x] 7.11 Buka aplikasi di dua tab. Majukan status di tab A, lalu ketuk tombol yang sama di tab B. Pastikan muncul pesan "status sudah berubah" dan data dimuat ulang tanpa melompat dua tahap.
- [x] 7.12 Periksa tampilan di tablet, atau DevTools 768 px dan 1024 px: tidak ada scroll horizontal, tombol mudah diketuk, dan keyboard numerik atau telepon muncul di field yang sesuai.
- [x] 7.13 Periksa header: SA melihat "Cek Status", "Dashboard", "Servis", "Keluar". Tamu yang membuka `/servis` diarahkan ke `/login`.

## 8. Penutupan

- [x] 8.1 Setelah pengguna mengonfirmasi uji manual lolos, perbarui baris "Iterasi terakhir yang selesai" di `CLAUDE.md` menjadi Iterasi 2, dan tambahkan keputusan yang dikunci (aturan transisi, `tanggal_selesai`, hapus terbatas, RPC) ke bagian keputusan.
