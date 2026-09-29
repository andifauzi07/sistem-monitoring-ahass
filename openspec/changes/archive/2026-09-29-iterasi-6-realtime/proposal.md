## Why

Perubahan status oleh Service Advisor belum terlihat oleh pihak lain tanpa tindakan manual:

- Pelanggan harus menekan "Cek Status" lagi atau me-refresh halaman.
- Tablet SA kedua baru mendapat data terbaru saat tab kembali aktif atau saat tombol "Muat ulang" ditekan.

Iterasi 6 (FR-3.4, FR-7.3, `docs/PRD.md` Bagian 13) menutup celah ini dengan Supabase Realtime, sehingga DoD terpenuhi: perubahan status langsung terlihat di halaman pelanggan tanpa reload.

## What Changes

- **Halaman publik `/`**: hasil pencarian diperbarui otomatis saat servis kendaraan tersebut berubah.
  - Role `anon` tidak punya akses tabel, sehingga `postgres_changes` tidak bisa dipakai. Sebagai gantinya dipakai **Supabase Broadcast** dari trigger DB ke channel publik per nomor polisi (`servis:<NOPOL>`).
  - Pesan broadcast hanya berupa sinyal tanpa data. Setelah menerimanya, halaman mengambil ulang data lewat RPC `cek_status` yang sudah tersanitasi.
  - Ada jaring pengaman: data juga diambil ulang saat tab kembali aktif dan saat koneksi realtime tersambung kembali setelah putus.
  - Halaman menampilkan indikator koneksi ("Live" atau sedang menghubungkan ulang), waktu pembaruan terakhir, dan pengumuman `aria-live` saat status berubah.
- **Halaman SA**: Dashboard, Daftar Servis, dan Detail Servis diperbarui otomatis lewat `postgres_changes` pada `layanan_service`.
  - Dashboard juga mendengarkan tabel `mekanik` untuk kartu mekanik hadir.
  - Event hanya dipakai sebagai sinyal untuk memanggil `muatUlang()` (dengan debounce), tidak diterapkan langsung ke state.
  - Refetch saat tab kembali aktif dan tombol "Muat ulang" tetap ada sebagai cadangan.
- **Halaman Edit Servis tidak diberi realtime**, agar isian form yang sedang diketik tidak tertimpa perubahan dari perangkat lain.
- **Hook bersama baru** menangani langganan channel, debounce, refetch saat tersambung ulang, dan refetch saat tab aktif. Hook ini menggantikan listener `visibilitychange` yang sekarang diduplikasi di tiga halaman SA.
- **Migrasi baru `0005_realtime.sql`**:
  - menambahkan `layanan_service` dan `mekanik` ke publication `supabase_realtime`;
  - membuat trigger yang mengirim sinyal broadcast bila kolom yang terlihat publik berubah. Trigger juga berjalan pada INSERT dan DELETE. Bila nomor polisi dikoreksi, sinyal dikirim ke topik nopol lama dan nopol baru.
- Tidak ada perubahan pada RPC `cek_status`, RLS, maupun kolom tabel.

## Capabilities

### New Capabilities

- `realtime-updates`: mekanisme sinkronisasi realtime lintas halaman. Mencakup:
  - publication `supabase_realtime` untuk klien yang login;
  - sinyal Broadcast tanpa data per nomor polisi untuk publik;
  - perilaku klien: sinyal lalu refetch, debounce, refetch saat tersambung ulang, dan refetch saat tab aktif.

### Modified Capabilities

- `public-monitoring`: hasil pencarian diperbarui otomatis tanpa reload, disertai indikator koneksi, waktu pembaruan terakhir, dan pengumuman perubahan status (FR-7.3).
- `sa-dashboard`: kartu dan tabel dashboard diperbarui otomatis saat data servis atau mekanik berubah (FR-3.4).
- `service-management`: daftar servis aktif dan halaman detail servis diperbarui otomatis saat servis diubah dari perangkat lain. Halaman edit dikecualikan.

## Impact

- **Database**:
  - migrasi baru `supabase/migrations/0005_realtime.sql`, dijalankan manual lewat SQL Editor;
  - isinya perubahan publication dan satu fungsi trigger baru `SECURITY DEFINER` yang memanggil `realtime.send`;
  - skema tabel tidak berubah, jadi `src/types/database.ts` tidak perlu diperbarui.
- **Konfigurasi Supabase**: akses channel publik di Realtime Settings harus diizinkan (sudah dikonfirmasi pengguna).
- **Kode**:
  - hook baru di `src/lib/` untuk realtime;
  - `PublicMonitoringPage.tsx`, `DashboardPage.tsx`, `ServisListPage.tsx`, dan `ServisDetailPage.tsx` memakai hook tersebut;
  - listener `visibilitychange` lokal di tiga halaman SA dihapus;
  - satu komponen kecil untuk indikator koneksi di halaman publik.
- **Dependency**: tidak ada yang baru (`@supabase/supabase-js` sudah menyertakan client Realtime).
- **Di luar scope**:
  - realtime di halaman Riwayat, Manajemen Mekanik, Edit Servis, dan dropdown mekanik di Detail Servis;
  - notifikasi WhatsApp (Iterasi 7);
  - penerapan payload event langsung ke state (optimistic update atau patch);
  - channel privat berbasis RLS `realtime.messages`.
