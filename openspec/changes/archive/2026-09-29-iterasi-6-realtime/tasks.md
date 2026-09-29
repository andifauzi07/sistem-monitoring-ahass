## 1. Migrasi Database

- [x] 1.1 Buat `supabase/migrations/0005_realtime.sql` untuk menambahkan `public.layanan_service` dan `public.mekanik` ke publication `supabase_realtime`. Bungkus dengan blok `DO` yang lebih dulu memeriksa `pg_publication_tables` agar migrasi idempoten (design D3).
- [x] 1.2 Di migrasi yang sama, buat fungsi trigger `public.siarkan_perubahan_servis()` sesuai design D2:
  - `SECURITY DEFINER` dengan `set search_path = ''`;
  - memanggil `realtime.send('{}'::jsonb, 'berubah', 'servis:' || nopol, false)`;
  - INSERT mengirim ke `NEW`, DELETE mengirim ke `OLD`;
  - UPDATE hanya mengirim bila kolom publik berubah (`IS DISTINCT FROM`), dan mengirim ke nopol lama bila nopol berubah;
  - dibungkus `EXCEPTION WHEN OTHERS THEN RAISE WARNING`.
- [x] 1.3 Pasang trigger `trg_siarkan_perubahan_servis` dengan `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` pada `layanan_service`, memakai `drop trigger if exists` lebih dulu. Lalu `revoke all on function public.siarkan_perubahan_servis() from public, anon, authenticated`.
- [x] 1.4 Perbarui `supabase/README.md`: tambahkan langkah menjalankan migrasi 0005 dan catatan bahwa Realtime Settings harus mengizinkan akses channel publik.

## 2. Hook Realtime Bersama

- [x] 2.1 Buat `src/lib/useSinyalRealtime.ts` sesuai design D4:
  - parameter `{ nama, pasang, aktif }` dan `muatUlang`;
  - membuat channel lewat `supabase.channel(nama, …)`, memanggil `pasang(channel)`, lalu `.subscribe(callback status)`;
  - mengembalikan `{ terhubung }`.
- [x] 2.2 Terapkan debounce ±300 ms: setiap event dari listener yang didaftarkan `pasang` memanggil `muatUlang()` satu kali setelah jeda. Pasang `clearTimeout` saat cleanup.
- [x] 2.3 Refetch saat tersambung ulang: tandai bila status sempat `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`, lalu panggil `muatUlang()` pada `SUBSCRIBED` berikutnya. Jangan refetch pada `SUBSCRIBED` pertama. Verifikasi perilaku rejoin di versi `@supabase/supabase-js` yang terpasang (Open Question di design).
- [x] 2.4 Pindahkan listener `visibilitychange` (refetch saat tab `visible`) ke dalam hook. Listener hanya aktif saat `aktif = true`.
- [x] 2.5 Cleanup: `supabase.removeChannel(channel)` saat unmount atau saat `nama`/`pasang`/`aktif` berubah. Sediakan helper kecil atau opsi agar channel publik dibuat dengan `config: { private: false }`.

## 3. Halaman SA

- [x] 3.1 `DashboardPage.tsx`: pakai `useSinyalRealtime` dengan channel `sa-dashboard`, yang mendengarkan `postgres_changes` `event: '*'` pada `layanan_service` dan `mekanik`. Hapus listener `visibilitychange` lokal.
- [x] 3.2 `ServisListPage.tsx`: pakai `useSinyalRealtime` dengan channel `sa-servis-list` pada `layanan_service`. Hapus listener `visibilitychange` lokal. Pastikan pencarian dan filter tidak ter-reset saat data dimuat ulang.
- [x] 3.3 `ServisDetailPage.tsx`: pakai `useSinyalRealtime` dengan channel `sa-servis-<id>`, yang mendengarkan `UPDATE` dengan filter `id=eq.<id>` dan `DELETE` tanpa filter (cocokkan `payload.old.id === id` sebelum memicu refetch). Hapus listener `visibilitychange` lokal. Pastikan dropdown mekanik yang belum disimpan tidak ter-reset oleh refetch yang tidak mengubah `mekanik_id`.
- [x] 3.4 Pastikan `ServisEditPage.tsx` tidak memakai realtime (design D5).

## 4. Halaman Publik

- [x] 4.1 `PublicMonitoringPage.tsx`: pakai `useSinyalRealtime` dengan channel publik `servis:<nopol>` yang mendengarkan `broadcast` event `berubah`. Isi payload diabaikan. Set `aktif` hanya bila ada nopol valid. Channel berpindah saat nopol di URL berganti.
- [x] 4.2 Pastikan refetch karena sinyal tidak menjadikan tombol "Cek Status" berstatus memuat dan tidak mengosongkan hasil. Bedakan loading awal untuk nopol baru dari penyegaran (design D6).
- [x] 4.3 Buat komponen indikator (mis. `src/components/IndikatorLive.tsx`) dengan dua keadaan:
  - titik hijau dan teks "Live · diperbarui otomatis" saat `terhubung`;
  - titik abu-abu dan teks "Menghubungkan ulang…" saat tidak terhubung.
    Tampilkan juga "Diperbarui pukul HH:MM" (WITA, helper format yang ada) dari waktu hasil terakhir dimuat.
- [x] 4.4 Tambahkan region `aria-live="polite"` yang mengumumkan "Status berubah menjadi <status>" hanya saat status servis aktif berbeda dari hasil sebelumnya untuk nopol yang sama. Beri highlight singkat pada kartu servis dengan transisi Tailwind.

## 5. Verifikasi Otomatis (Agent)

- [x] 5.1 Jalankan `npm run lint` dan pastikan lolos.
- [x] 5.2 Jalankan `npm run build` dan pastikan type-check serta build produksi sukses.

## 6. Tugas Pengguna (Bukan Agent)

- [x] 6.1 Jalankan `supabase/migrations/0005_realtime.sql` di Supabase SQL Editor. Pastikan tidak ada error, lalu jalankan sekali lagi untuk mengecek idempotensi.
- [x] 6.2 Uji manual halaman publik. Buka `/?nopol=<NOPOL>` di HP atau jendela incognito, lalu ubah data dari SA di jendela lain:
  - status maju dan mundur harus langsung tampil tanpa reload;
  - indikator "Live" tampil;
  - pengumuman atau highlight muncul saat status berubah;
  - daftarkan servis untuk nopol yang tadinya "tidak ditemukan";
  - koreksi nopol lewat Edit: halaman nopol lama dan nopol baru sama-sama ikut diperbarui;
  - matikan jaringan sebentar: indikator berubah dan data kembali segar setelah jaringan pulih;
  - kunci layar HP lalu buka lagi.
- [x] 6.3 Uji manual SA dengan dua jendela atau tablet yang login:
  - Dashboard, Daftar Servis (dengan filter aktif), dan Detail Servis di jendela A ikut berubah saat jendela B mengubah status, mendaftarkan, menugaskan mekanik, atau menghapus servis;
  - ubah status hadir mekanik, lalu cek kartu Mekanik yang Hadir di Dashboard;
  - halaman Edit di jendela A tidak tertimpa saat jendela B mengubah servis yang sama.
- [x] 6.4 Pastikan tidak ada data pribadi (nama, WA, keluhan, kilometer, mekanik) di payload broadcast. Cek di DevTools → Network → WS pada halaman publik.
