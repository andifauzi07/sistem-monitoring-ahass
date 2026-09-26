## Why

Service Advisor (SA) belum bisa mencatat servis apa pun, padahal semua fitur berikutnya bergantung pada data `layanan_service`: dashboard, riwayat, penugasan mekanik, halaman publik, dan WhatsApp. Iterasi 2 (PRD Bagian 13) mengimplementasikan modul Kelola Service.

Hasil eksplorasi dengan pengguna menunjukkan cakupan FR-3 di PRD kurang lengkap:

- Mekanik melaporkan progres secara lisan, lalu **SA yang mengklik setiap perpindahan status**.
- Tanpa aksi ubah status untuk tahap tengah dan `Sudah Diambil`, pelanggan tidak pernah melihat progres.
- Kendaraan juga tidak bisa didaftarkan lagi, karena index "satu servis aktif per kendaraan" hanya terlepas saat status `Sudah Diambil`.

## What Changes

- **Tambah servis (FR-3.1):**
  - Form berisi nomor polisi, nama pembawa, nomor WA, jenis motor, kilometer, dan masalah.
  - Saat nopol dikenali, nama pembawa, nomor WA, dan jenis motor terisi otomatis dari kunjungan terakhir.
  - Penyimpanan lewat RPC `daftar_servis`: upsert `pelanggan` lalu insert `layanan_service` dalam satu transaksi.
  - Jika kendaraan masih punya servis aktif, muncul error yang jelas.
- **Edit layanan (FR-3.2, diperluas dari "Edit Masalah"):**
  - Semua field data bisa diubah, kecuali status, selama servis belum `Sudah Diambil`.
  - Koreksi nomor polisi menyambungkan ulang layanan ke `pelanggan` yang benar.
  - Nama pembawa dan nomor WA juga memperbarui kontak di `pelanggan`.
  - Semua ini lewat RPC `ubah_servis`.
- **Ubah status (FR-3.3, diperluas dari "Selesaikan Service"):**
  - SA memindahkan status maju atau mundur satu langkah sesuai urutan enum. Aturan ini dijaga trigger database.
  - `Sudah Diambil` bersifat final: status tidak bisa mundur dan data terkunci.
  - `tanggal_selesai` diisi otomatis saat status menjadi `Selesai Dikerjakan`, dan dikosongkan lagi saat status mundur dari sana.
  - Di UI, cukup satu ketuk "→ ⟨status berikutnya⟩" dari daftar.
  - Toast "Batalkan" muncul sekitar 5 detik setelah perubahan.
  - Langkah ke `Selesai Dikerjakan` dan `Sudah Diambil` memerlukan konfirmasi.
- **Hapus layanan (FR-3.5, baru):**
  - Hanya diizinkan selama status `Menunggu Antrian`. Aturan ini dijaga di database.
  - Hapus selalu didahului dialog konfirmasi.
- **Riwayat status (FR-3.4):** tetap dicatat oleh trigger yang sudah ada dan ditampilkan sebagai linimasa di halaman detail. Pembaruan realtime ditunda ke Iterasi 6.
- **Halaman baru untuk SA** (terproteksi, dioptimalkan untuk tablet):
  - `/servis`: daftar servis aktif, pencarian nopol, dan filter status;
  - `/servis/baru`: form servis baru;
  - `/servis/:id`: detail, aksi status, dan linimasa riwayat;
  - `/servis/:id/edit`: form edit.

  Header mendapat tautan "Servis".
- **Migrasi `0002_kelola_service.sql`:**
  - trigger validasi transisi status dan `tanggal_selesai`;
  - penguncian data `Sudah Diambil`;
  - pembatasan hapus;
  - RPC `daftar_servis` dan `ubah_servis`.

  Tipe di `src/types/database.ts` ikut diperbarui.
- **PRD diperbarui:**
  - FR-3.2 menjadi "Edit Layanan Service";
  - FR-3.3 menjadi "Ubah Status Service";
  - tambah FR-3.5 "Hapus Layanan Service";
  - Iterasi 2 di Bagian 13 menjadi FR-3.1 – FR-3.5.
- **Di luar scope:**
  - penugasan mekanik, termasuk kolom mekanik di UI (Iterasi 4b);
  - dashboard agregat dan halaman riwayat (Iterasi 3);
  - realtime (Iterasi 6);
  - WhatsApp;
  - status "Dibatalkan" atau soft delete.

## Capabilities

### New Capabilities

- `service-management`: Pengelolaan layanan servis oleh SA dari UI, yaitu daftar servis aktif, tambah, edit, ubah status (termasuk batal dan konfirmasi), hapus, dan detail beserta riwayat status.

### Modified Capabilities

- `database-schema`: Menambah aturan di level database:
  - transisi status ±1 langkah;
  - `tanggal_selesai` otomatis;
  - layanan `Sudah Diambil` tidak dapat diubah;
  - hapus hanya saat `Menunggu Antrian`;
  - RPC `daftar_servis` dan `ubah_servis` untuk authenticated.
- `sa-authentication`: Requirement "Navigasi sesuai status sesi" berubah. Header untuk SA kini juga menampilkan tautan "Servis".

## Impact

- **Database:** migrasi baru `supabase/migrations/0002_kelola_service.sql`, dijalankan manual oleh pengguna lewat SQL Editor. Tidak ada kolom yang diganti nama atau dihapus.
- **Kode baru:**
  - modul data dan pemetaan error servis di `src/lib/`;
  - helper status;
  - halaman `/servis`, `/servis/baru`, `/servis/:id`, `/servis/:id/edit`;
  - komponen form servis, badge status, dialog konfirmasi, dan toast batal.
- **Kode diubah:**
  - `src/router.tsx`: menambah rute baru di bawah `RequireAuth`;
  - `src/components/Layout.tsx`: menambah tautan "Servis";
  - `src/types/database.ts`: menambah fungsi RPC.
- **Dependencies:** tidak ada yang baru.
- **Dokumentasi:**
  - `docs/PRD.md`: FR-3 dan Bagian 13;
  - `supabase/README.md`: langkah migrasi 0002 dan query verifikasi;
  - `CLAUDE.md`: progres iterasi, setelah uji manual pengguna.
