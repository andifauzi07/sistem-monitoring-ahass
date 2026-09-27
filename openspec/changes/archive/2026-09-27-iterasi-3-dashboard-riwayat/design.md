## Context

`/dashboard` saat ini adalah placeholder (`src/pages/DashboardPage.tsx`). Skema DB untuk `layanan_service` dan `mekanik` sudah lengkap sejak `0001_init_schema.sql`, termasuk kolom `mekanik_id` pada `layanan_service` dan `status_hadir`/`is_active` pada `mekanik`. RLS sudah memberi role `authenticated` akses penuh (`for all ... using (true) with check (true)`) ke kedua tabel ini, jadi tidak ada perubahan skema atau RLS yang diperlukan untuk iterasi ini — CRUD mekanik (Iterasi 4) dan penugasan mekanik (Iterasi 4b) belum ada, sehingga `mekanik` akan selalu kosong dan `mekanik_id` akan selalu `null` untuk saat ini. Itu kondisi yang diharapkan, bukan kondisi yang perlu ditangani sebagai error.

Pola akses data baca yang sudah mapan di `src/lib/servis.ts` (`ambilServisAktif`) adalah query langsung `supabase.from(...).select(...)` tanpa RPC. Dashboard dan riwayat murni membaca data (tidak ada mutasi lintas tabel), sehingga pola yang sama dipakai di sini.

## Goals / Non-Goals

**Goals:**
- Dashboard menampilkan tiga widget (dua kartu + satu tabel) dengan data agregat nyata dari `layanan_service` dan `mekanik`.
- Halaman Riwayat menampilkan servis `Sudah Diambil` dengan filter tanggal (`tanggal_selesai`) dan nomor polisi.
- Tetap konsisten dengan pola baca data, penamaan kolom, dan komponen (mis. `StatusBadge`) yang sudah ada.

**Non-Goals:**
- Tidak mengimplementasikan CRUD mekanik atau penugasan mekanik (`mekanik_id` tetap `null`, ditangani Iterasi 4 / 4b).
- Tidak mengimplementasikan realtime (Supabase Realtime Subscription tetap ditunda ke Iterasi 6 sesuai `CLAUDE.md`).
- Tidak membuat RPC baru — tidak ada mutasi, hanya query baca.
- Tidak membuat migrasi DB baru — skema dan RLS yang relevan sudah ada.

## Decisions

**1. Query langsung, bukan RPC.**
Dashboard/Riwayat hanya membaca data untuk role `authenticated` yang sudah punya akses penuh via RLS. Membuat RPC `SECURITY INVOKER`/`DEFINER` baru untuk operasi baca sederhana ini menambah lapisan tanpa manfaat (beda dengan `daftar_servis`/`ubah_servis`/`hapus_servis` di Iterasi 2 yang perlu RPC karena menulis ke >1 tabel dalam satu transaksi).

**2. Satu query untuk kartu "Total Unit Entry" + tabel "Aktifitas Hari Ini".**
Keduanya memakai filter yang identik (`status <> 'Sudah Diambil'`). Ambil satu kali dengan `.select('*').neq('status', 'Sudah Diambil')` (mirip `ambilServisAktif`, tanpa perlu diurutkan berdasarkan `tanggal_masuk` karena tidak dibatasi hari ini) — jumlah baris hasil query = nilai kartu, isi array = baris tabel. Menghindari dua round-trip untuk data yang sama.

**3. Kartu "Mekanik yang Hadir" = query terpisah ke tabel `mekanik`.**
`select('id, status_hadir').eq('is_active', true)`, lalu hitung `hadir = count(status_hadir=true)` dan `total = length`. Terpisah dari query di atas karena tabel berbeda; query ini tetap dijalankan walau hasilnya `0/0` untuk saat ini — dashboard tidak boleh menyembunyikan kartu ini (sudah dikonfirmasi pengguna).

**4. Kolom "Mekanik" di tabel Aktifitas Hari Ini tidak melakukan join ke tabel `mekanik`.**
Karena `mekanik_id` selalu `null` pada iterasi ini, kolom cukup menampilkan `"-"` bila `mekanik_id` bernilai `null` (yang akan selalu terjadi sekarang). Tidak perlu embed relasi Supabase (`mekanik(nama)`) sampai Iterasi 4b benar-benar mengisi `mekanik_id` — menghindari kode yang belum bisa diuji jalurnya.

**5. Riwayat: query terpisah, difilter `status = 'Sudah Diambil'`, urut `tanggal_selesai` menurun.**
Filter tanggal diterapkan ke `tanggal_selesai` (tanggal servis selesai dikerjakan, kolom yang diisi trigger DB di Iterasi 2) — bukan `tanggal_masuk` — karena "riwayat" secara alami disusun berdasarkan kapan servis itu tuntas/keluar dari pit. Filter nomor polisi memakai `normalizeNopol` (pola sama seperti `cariKendaraan`) lalu `.ilike('nomor_polisi', ...)` pada kolom yang sudah dinormalisasi di DB.

**6. Modul baru `src/lib/dashboard.ts` dan `src/lib/riwayat.ts`.**
Dipisah dari `src/lib/servis.ts` karena keduanya untuk kebutuhan baca khusus halaman baru, bukan bagian dari alur CRUD servis. Tetap mengekspor fungsi bertipe `Promise<Hasil<T>>` mengikuti konvensi `servisErrors.ts`.

**7. Navigasi.**
Tambah `NavLink` "Riwayat" di `Layout.tsx` di grup yang sama dengan "Dashboard"/"Servis" (hanya tampil untuk `status === 'authenticated'`).

## Risks / Trade-offs

- **[Risk]** Kartu "Mekanik yang Hadir" yang selalu `0/0` bisa terlihat seperti bug bagi pengguna baru → **Mitigasi**: ini keputusan produk yang sudah dikonfirmasi; tidak perlu penanganan UI khusus (mis. teks "belum ada data"), tampilkan apa adanya agar konsisten dengan data real begitu Iterasi 4 selesai.
- **[Risk]** Tabel "Aktifitas Hari Ini" bisa jadi panjang seiring waktu karena mencakup semua servis aktif tanpa batas tanggal → **Mitigasi**: di luar scope iterasi ini (tidak ada paginasi); volume servis aktif di satu bengkel pada satu waktu secara realistis kecil (puluhan, bukan ribuan).
- **[Risk]** Filter tanggal di Riwayat berbasis `tanggal_selesai` yang bisa `null` secara teori (servis lama sebelum trigger ada) → **Mitigasi**: tidak relevan untuk data baru (trigger Iterasi 2 selalu mengisi `tanggal_selesai` sebelum status bisa mencapai `Sudah Diambil`); baris dengan `tanggal_selesai = null` (seharusnya tidak ada) otomatis tidak lolos filter tanggal manapun.

## Migration Plan

Tidak ada migrasi DB. Perubahan murni frontend (halaman, komponen, modul query). Deploy mengikuti alur build normal (`npm run build` lalu deploy Vercel seperti biasa) — tidak ada langkah rollback khusus di luar revert kode.

## Open Questions

- Desain persis alur assign `mekanik_id` (dipicu saat SA menaikkan status dari `Menunggu Antrian`, sesuai penjelasan pengguna di sesi eksplorasi) belum diformalkan — akan dibahas ulang saat proposal Iterasi 4b dibuat, bukan bagian dari iterasi ini.
