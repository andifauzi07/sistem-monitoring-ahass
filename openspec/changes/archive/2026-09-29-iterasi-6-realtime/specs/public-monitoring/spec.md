## ADDED Requirements

### Requirement: Hasil pencarian diperbarui otomatis
Selama halaman publik menampilkan hasil untuk nomor polisi yang valid, halaman SHALL berlangganan sinyal broadcast `servis:<NOPOL>` untuk nomor polisi tersebut. Setiap kali sinyal diterima, halaman SHALL mengambil ulang data melalui `cek_status`, tanpa reload dan tanpa tindakan pelanggan (FR-7.3).

Aturan tambahan:
- Saat nomor polisi di URL berganti, langganan SHALL berpindah ke topik nomor polisi yang baru.
- Tanpa nomor polisi yang valid, halaman MUST NOT berlangganan channel apa pun.
- Pemuatan ulang karena sinyal MUST NOT menampilkan indikator memuat pada tombol "Cek Status" dan MUST NOT mengosongkan hasil yang sedang tampil.

#### Scenario: SA mengubah status saat pelanggan membuka halaman
- **WHEN** pelanggan membuka `/?nopol=DC1234AB`, lalu SA mengubah status servis kendaraan tersebut ke `Dikerjakan`
- **THEN** stepper dan badge di halaman pelanggan berpindah ke `Dikerjakan` tanpa reload

#### Scenario: Servis didaftarkan setelah pencarian tidak ditemukan
- **WHEN** halaman menampilkan "tidak ditemukan" untuk `DC5678XY`, lalu SA mendaftarkan servis untuk kendaraan itu
- **THEN** halaman otomatis menampilkan kartu servis aktif `DC5678XY`

#### Scenario: Servis dihapus
- **WHEN** halaman menampilkan servis aktif `Menunggu Antrian`, lalu SA menghapus servis tersebut
- **THEN** halaman otomatis memperbarui hasil sesuai data terbaru dari `cek_status`

#### Scenario: Ganti nomor polisi
- **WHEN** pelanggan mencari `DC1111AA`, lalu mencari `DC2222BB`
- **THEN** perubahan pada `DC1111AA` tidak lagi memicu pemuatan ulang, dan perubahan pada `DC2222BB` memicunya

#### Scenario: Kembali ke tab di HP
- **WHEN** pelanggan mengunci layar HP, lalu membuka kembali browser yang menampilkan hasil pencarian
- **THEN** halaman mengambil ulang data sehingga status yang tampil adalah status terbaru

### Requirement: Indikator pembaruan langsung
Saat hasil pencarian tampil, halaman SHALL menampilkan tiga hal:
1. Indikator koneksi realtime: "Live" saat tersambung, dan keterangan sedang menghubungkan ulang saat tidak tersambung.
2. Waktu pembaruan terakhir ("Diperbarui pukul HH:MM", WITA).
3. Pengumuman melalui region `aria-live="polite"` dengan teks "Status berubah menjadi <status>", disertai penanda visual singkat pada kartu servis. Pengumuman ini hanya muncul bila status servis aktif berubah dibanding tampilan sebelumnya.

Indikator koneksi MUST NOT menghalangi tampilan data yang sudah ada.

#### Scenario: Tersambung
- **WHEN** hasil pencarian tampil dan channel realtime tersambung
- **THEN** indikator menampilkan status "Live"

#### Scenario: Koneksi terputus
- **WHEN** koneksi realtime terputus
- **THEN** indikator menampilkan keterangan sedang menghubungkan ulang, sementara data terakhir tetap tampil

#### Scenario: Status berubah
- **WHEN** status servis aktif berubah dari `Diperiksa` ke `Dikerjakan` akibat sinyal realtime
- **THEN** pembaca layar mengumumkan "Status berubah menjadi Dikerjakan", kartu servis diberi penanda visual singkat, dan waktu pembaruan terakhir diperbarui

#### Scenario: Pembaruan tanpa perubahan status
- **WHEN** data dimuat ulang tetapi status servis aktif tetap sama
- **THEN** waktu pembaruan terakhir diperbarui tanpa pengumuman perubahan status
