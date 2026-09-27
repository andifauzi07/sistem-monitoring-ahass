## 1. Shell navigasi (`src/components/Layout.tsx`)

- [x] 1.1 Refactor `Layout.tsx`: ekstrak daftar item nav SA & guest jadi data (array) agar bisa dirender ulang di dua tempat (panel mobile & sidebar) tanpa duplikasi markup.
- [x] 1.2 Implementasikan mode topbar (< 640px): header ringkas + tombol toggle (ikon `Menu`/`X` dari `lucide-react`) untuk SA yang membuka panel berisi item nav SA, target sentuh ≥44px per item.
- [x] 1.3 Untuk guest di mode topbar: render item nav ("Cek Status", "Masuk") inline langsung tanpa tombol toggle/panel.
- [x] 1.4 Implementasikan mode sidebar (≥ 640px, khusus SA/authenticated): sidebar di kiri berisi seluruh item nav, ikon + label. (Direvisi task 5.1 — sidebar sekarang bisa di-collapse lewat toggle, lihat bagian 5.)
- [x] 1.5 Sesuaikan struktur `<main>`/`<Outlet />` agar duduk di kolom kanan sidebar pada mode ≥640px, tanpa mengubah isi halaman anak.
- [x] 1.6 Pastikan footer tidak lagi terpengaruh overflow horizontal dari nav. (Direvisi task 5.2 — footer sekarang hanya tampil untuk guest, lihat bagian 5.)
- [x] 1.7 Tutup panel mobile otomatis saat navigasi berpindah rute (klik salah satu link nav). Diimplementasikan lewat `onClick` langsung di tiap link panel (bukan `useEffect` — memicu lint `react-hooks/set-state-in-effect`).

## 2. Tombol aksi mengambang (`src/pages/MekanikPage.tsx`)

- [x] 2.1 Tambahkan padding aman dari tepi bawah pada FAB "Tambah Mekanik" agar tidak mepet home-indicator iOS. Diimplementasikan lewat offset posisi `bottom-[calc(1.5rem_+_env(safe-area-inset-bottom,0px))]` (bukan `padding-bottom` di elemen — supaya bentuk lingkaran & posisi ikon tidak berubah).
- [x] 2.2 Sesuaikan z-index FAB relatif terhadap panel navigasi mobile baru (poin 1.2) agar keduanya tidak saling menutupi saat kebetulan terbuka bersamaan. Header mobile diberi `z-20` (di atas FAB `z-10`).

## 3. Verifikasi otomatis

- [x] 3.1 Jalankan `npm run build` (type-check + build produksi) dan pastikan lolos. Sempat blocked oleh kerja paralel `iterasi-4b-penugasan-mekanik` yang belum selesai di sesi sebelumnya — sudah lolos setelah change tersebut lanjut dikerjakan pengguna.
- [x] 3.2 Jalankan `npm run lint` dan pastikan lolos. Lolos bersih (0 error, 0 warning).

## 5. Revisi susulan: sidebar toggle, footer khusus guest, guest tanpa sidebar

- [x] 5.1 Sidebar SA (`Layout.tsx`) diberi tombol toggle (ikon `PanelLeftClose`/`PanelLeftOpen`) di baris brand, mengecilkan sidebar ke icon-rail (~4rem, ikon + `title` tooltip, nav tetap bisa diklik) atau mengembalikan ke tampilan penuh (ikon + label). State toggle disimpan di `useState` lokal (tidak persist ke localStorage — cukup bertahan selama sesi SPA berjalan).
- [x] 5.2 Footer (`Layout.tsx`) diubah agar hanya dirender ketika `status !== 'authenticated'` — hilang total begitu SA login, di seluruh lebar layar.
- [x] 5.3 Sidebar (`<aside>`) diubah agar hanya dirender ketika `status === 'authenticated'` — guest/belum login tidak pernah mendapat sidebar. Header topbar guest kehilangan pembatas `sm:hidden` sehingga topbar guest konsisten tampil di semua lebar layar (termasuk tablet/laptop/PC), termasuk pada halaman "/".
- [x] 5.4 `npm run build` dan `npm run lint` dijalankan ulang setelah perubahan 5.1–5.3 — keduanya lolos bersih.
- [x] 5.5 Perbarui `proposal.md`, `design.md`, dan `specs/app-shell/spec.md` agar konsisten dengan keputusan baru ini.
- [x] 5.6 Sidebar SA (`<aside>`) diberi `sm:sticky sm:top-0 sm:h-dvh sm:self-start` agar tingginya mengikuti viewport dan tidak ikut scroll bersama konten `<main>`; nav internal diberi `overflow-y-auto` sebagai fallback viewport pendek. `npm run build`/`lint` lolos bersih setelahnya.
- [x] 5.7 (Sempat ditambah, lalu **dibatalkan** atas permintaan pengguna) `NO_SIDEBAR_PATHS = ['/', '/login']` untuk membuat rute tersebut topbar-only meski SA login. Pengguna melaporkan "sidebar tetap muncul di / sebelum login"; penelusuran kode menunjukkan logikanya sudah benar (tidak mungkin sidebar muncul di rute tersebut terlepas status login), kemungkinan besar cache/stale build di browser. Daripada berlama-lama verifikasi, pengguna memilih membatalkan fitur ini — reverted, `isAuthenticated` dipakai lagi apa adanya untuk `<aside>` dan `sm:hidden` header (sidebar SA tampil di semua rute authenticated, termasuk "/"). `npm run build`/`lint` lolos bersih setelah revert.
- [x] 5.8 **Bug nyata ditemukan & diperbaiki**: pengguna melaporkan guest di tablet/laptop tetap melihat "sidebar" di halaman "/". Penyebabnya: div pembungkus `<aside>`+`<header>`+konten memakai `sm:flex-row` tanpa syarat, sedangkan `<header>` guest sengaja tidak diberi `sm:hidden` (supaya topbar guest tetap tampil di lebar layar manapun) — akibatnya di ≥640px, `<header>` guest ikut jadi flex item dalam row bersama kolom konten, menyusut jadi kolom sempit di kiri yang terlihat seperti sidebar. Diperbaiki dengan membuat `sm:flex-row` bersyarat: `` `flex flex-1 flex-col ${isAuthenticated ? 'sm:flex-row' : ''}` `` — guest sekarang tetap `flex-col` di semua lebar layar (header selalu full-width di atas), SA tetap dapat `sm:flex-row` (sidebar+konten berdampingan) seperti sebelumnya. `npm run build`/`lint` lolos bersih setelahnya.

## 4. Uji manual & commit (tugas pengguna)

- [x] 4.1 Uji manual navigasi & footer di viewport HP (< 640px): pastikan tidak ada overflow horizontal, panel menu SA bisa dibuka/ditutup, nav guest tampil inline, footer tampil untuk guest.
- [x] 4.2 Uji manual sidebar SA di viewport tablet & laptop/PC (≥ 640px): pastikan seluruh item nav terlihat, toggle collapse/expand berfungsi (icon-rail tetap bisa diklik untuk navigasi), tidak ada elemen terpotong, dan sidebar tetap diam di tempat (tidak ikut ke atas) saat konten halaman (mis. tabel Dashboard/Riwayat yang panjang) di-scroll.
- [x] 4.3 Uji manual FAB "Tambah Mekanik" di HP (idealnya di perangkat/emulator dengan home-indicator, mis. iPhone) untuk memastikan tidak tertutup UI sistem.
- [x] 4.4 Uji manual guest di viewport tablet/laptop/PC (≥ 640px) pada halaman "/" dan "/login": pastikan yang tampil topbar inline, bukan sidebar.
- [x] 4.5 Uji manual: footer tampil saat belum login, dan hilang begitu berhasil login (di HP maupun tablet/PC); muncul lagi setelah "Keluar".
- [x] 4.6 Setelah uji manual lolos, commit perubahan dan (bila perlu) arsipkan change ini via `/opsx:archive`.
