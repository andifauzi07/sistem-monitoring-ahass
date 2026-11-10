# database-schema Specification (Delta)

## ADDED Requirements

### Requirement: Tabel riwayat_notifikasi
Database SHALL memiliki tabel `riwayat_notifikasi` untuk mencatat riwayat pengiriman notifikasi WhatsApp pelanggan, dengan foreign key ke `layanan_service.id` (ON DELETE CASCADE), kolom `nomor_tujuan` (text), `pesan` (text), `status` (text: `berhasil` atau `gagal`), `respons_gateway` (jsonb atau text opsional), dan `dibuat_pada` (timestamptz default now()).

#### Scenario: Baris riwayat notifikasi tersimpan
- **WHEN** baris baru disisipkan ke `riwayat_notifikasi` dengan `layanan_service_id` valid dan status `berhasil`
- **THEN** data tersimpan dengan timestamp `dibuat_pada` terisi otomatis

#### Scenario: Penghapusan layanan_service menghapus riwayat terkait
- **WHEN** baris `layanan_service` dihapus
- **THEN** seluruh baris pada `riwayat_notifikasi` yang merujuk ke layanan tersebut otomatis terhapus (cascade)

### Requirement: Row Level Security tabel riwayat_notifikasi
Tabel `riwayat_notifikasi` SHALL mengaktifkan Row Level Security (RLS). Role `authenticated` (Service Advisor) SHALL memiliki hak akses `SELECT` dan `INSERT`. Role `anon` MUST NOT dapat membaca atau menulis tabel ini secara langsung.

#### Scenario: Service Advisor membaca riwayat notifikasi
- **WHEN** user terotentikasi melakukan `select` pada `riwayat_notifikasi` untuk servis tertentu
- **THEN** data riwayat notifikasi dikembalikan dengan sukses

#### Scenario: Klien anon membaca riwayat notifikasi
- **WHEN** klien publik tanpa login mencoba melakukan `select` langsung pada `riwayat_notifikasi`
- **THEN** database menolak atau mengembalikan hasil kosong
