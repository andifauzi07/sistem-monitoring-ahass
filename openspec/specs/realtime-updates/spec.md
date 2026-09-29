# realtime-updates Specification

## Purpose
Sinkronisasi realtime lintas halaman (FR-3.4, FR-7.3): publication `supabase_realtime` untuk klien login, sinyal Broadcast tanpa data per nomor polisi untuk halaman publik, serta perilaku klien (sinyal lalu muat ulang, debounce, muat ulang saat tersambung kembali dan saat tab aktif).

## Requirements
### Requirement: Publikasi perubahan tabel untuk klien login
Database SHALL menyertakan tabel `layanan_service` dan `mekanik` dalam publication `supabase_realtime`, sehingga klien yang login dapat menerima event `postgres_changes`. Penerimaan event MUST tetap tunduk pada RLS. Role `anon` MUST NOT menerima event `postgres_changes` dari tabel mana pun. Migrasi yang menambahkannya SHALL aman dijalankan ulang.

#### Scenario: SA menerima event perubahan servis
- **WHEN** klien yang login berlangganan `postgres_changes` pada `layanan_service`, lalu sebuah servis diubah statusnya
- **THEN** klien menerima event perubahan untuk baris tersebut

#### Scenario: Anon tidak menerima event tabel
- **WHEN** klien tanpa login berlangganan `postgres_changes` pada `layanan_service`, lalu sebuah servis diubah
- **THEN** klien tidak menerima event berisi data baris apa pun

#### Scenario: Migrasi dijalankan ulang
- **WHEN** migrasi realtime dijalankan dua kali
- **THEN** tidak ada error dan kedua tabel tercantum tepat satu kali di publication

### Requirement: Sinyal broadcast publik per nomor polisi
Database SHALL mengirim pesan Broadcast dengan event `berubah` ke channel publik (non-privat) bertopik `servis:<nomor_polisi>` setiap kali terjadi salah satu hal berikut pada `layanan_service`:
- baris ditambah;
- baris dihapus;
- salah satu kolom `status`, `nomor_polisi`, `jenis_motor`, `tanggal_masuk`, atau `tanggal_selesai` berubah.

Bila `nomor_polisi` berubah, sinyal MUST dikirim ke topik nomor polisi lama maupun baru. Perubahan yang hanya menyentuh kolom lain (mis. `mekanik_id`, `masalah`) MUST NOT mengirim sinyal.

#### Scenario: Status berubah
- **WHEN** status servis kendaraan `DC1234AB` berubah dari `Diperiksa` ke `Dikerjakan`
- **THEN** satu sinyal `berubah` dikirim ke topik `servis:DC1234AB`

#### Scenario: Koreksi nomor polisi
- **WHEN** SA mengoreksi nomor polisi servis dari `DC1234AB` menjadi `DC1234AC`
- **THEN** sinyal `berubah` dikirim ke topik `servis:DC1234AB` dan `servis:DC1234AC`

#### Scenario: Servis baru didaftarkan
- **WHEN** servis baru untuk `DC5678XY` didaftarkan
- **THEN** sinyal `berubah` dikirim ke topik `servis:DC5678XY`

#### Scenario: Hanya mekanik yang berubah
- **WHEN** SA menugaskan mekanik ke servis tanpa mengubah kolom lain
- **THEN** tidak ada sinyal broadcast yang dikirim

### Requirement: Sinyal broadcast tanpa data pelanggan
Payload sinyal broadcast MUST NOT berisi data servis maupun data pelanggan apa pun, termasuk nama, nomor WA, keluhan, kilometer, mekanik, id internal, dan status. Klien MUST memperoleh data hanya melalui RPC `cek_status`, dan MUST mengabaikan isi payload sinyal.

#### Scenario: Isi payload diperiksa
- **WHEN** klien menerima sinyal `berubah` di topik `servis:<NOPOL>`
- **THEN** payload tidak memuat kolom data apa pun

#### Scenario: Broadcast palsu dari klien lain
- **WHEN** seseorang mengirim broadcast berisi status palsu ke topik `servis:<NOPOL>`
- **THEN** halaman pelanggan hanya mengambil ulang data lewat `cek_status` dan tetap menampilkan status asli dari database

### Requirement: Kegagalan broadcast tidak menggagalkan transaksi
Kegagalan pengiriman sinyal broadcast MUST NOT membatalkan perubahan data yang memicunya.

#### Scenario: Realtime sedang gangguan
- **WHEN** pengiriman broadcast gagal saat SA mengubah status servis
- **THEN** perubahan status tetap tersimpan dan riwayat status tetap tercatat

### Requirement: Event memicu pemuatan ulang dengan debounce
Setiap halaman yang berlangganan realtime SHALL memperlakukan event sebagai sinyal untuk memuat ulang data melalui loader halaman, bukan menerapkan payload event ke tampilan. Event yang datang beruntun dalam jeda singkat (±300 ms) SHALL digabung menjadi satu kali pemuatan ulang. Selama pemuatan ulang, data lama MUST tetap tampil tanpa berkedip.

#### Scenario: Beberapa event beruntun
- **WHEN** tiga event diterima dalam rentang 200 ms
- **THEN** halaman hanya memuat ulang data satu kali

#### Scenario: Data lama tetap tampil
- **WHEN** halaman memuat ulang karena sinyal realtime
- **THEN** data sebelumnya tetap terlihat sampai data baru tiba

### Requirement: Pemuatan ulang saat tersambung kembali dan saat tab aktif
Halaman yang berlangganan realtime SHALL memuat ulang data dalam dua kondisi berikut:
- saat channel kembali berstatus tersambung setelah sebelumnya terputus;
- saat tab browser kembali terlihat.

Pemuatan ulang MUST NOT dilakukan pada sambungan pertama kali, karena pemuatan awal sudah dilakukan saat halaman dibuka. Saat pengguna meninggalkan halaman, langganan channel SHALL dilepas.

#### Scenario: Koneksi pulih
- **WHEN** koneksi realtime terputus, lalu tersambung kembali
- **THEN** halaman memuat ulang data satu kali untuk menutup perubahan yang terlewat

#### Scenario: Kembali ke tab
- **WHEN** pengguna membuka aplikasi lain, lalu kembali ke tab halaman
- **THEN** halaman memuat ulang data

#### Scenario: Meninggalkan halaman
- **WHEN** pengguna berpindah dari halaman yang berlangganan ke halaman lain
- **THEN** channel realtime halaman sebelumnya dilepas dan tidak lagi memicu pemuatan ulang
