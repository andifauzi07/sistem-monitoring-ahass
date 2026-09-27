## ADDED Requirements

### Requirement: Navigasi responsif dua-mode untuk pengguna authenticated
Untuk pengguna berstatus SA (authenticated), sistem SHALL menampilkan navigasi utama dalam dua mode berdasarkan lebar viewport, dengan titik ganti (breakpoint) di 640px (Tailwind `sm`): mode topbar untuk viewport lebih sempit dari 640px, dan mode sidebar untuk viewport 640px ke atas.

#### Scenario: Viewport HP menampilkan topbar untuk SA
- **WHEN** SA yang sudah login membuka aplikasi pada viewport lebih sempit dari 640px
- **THEN** navigasi ditampilkan sebagai topbar horizontal di bagian atas, bukan sidebar

#### Scenario: Viewport tablet/laptop/PC menampilkan sidebar untuk SA
- **WHEN** SA yang sudah login membuka aplikasi pada viewport 640px atau lebih lebar
- **THEN** navigasi ditampilkan sebagai sidebar di sisi kiri, dengan seluruh item menu terlihat (ikon + label secara default)

#### Scenario: Sidebar tetap di posisi tetap saat konten discroll
- **WHEN** SA men-scroll konten halaman yang lebih tinggi dari viewport pada mode sidebar (≥640px)
- **THEN** tinggi sidebar mengikuti tinggi layar (viewport) dan sidebar tetap terlihat penuh di posisinya, tidak ikut bergeser ke atas mengikuti scroll konten

#### Scenario: Navigasi tidak overflow horizontal
- **WHEN** navigasi ditampilkan pada mode topbar (HP) dengan jumlah item menu SA (6 item)
- **THEN** tidak ada elemen navigasi yang terpotong atau memaksa halaman bisa di-scroll horizontal

### Requirement: Guest/belum login selalu memakai topbar, tidak pernah sidebar
Untuk pengguna yang belum login (guest), termasuk pada halaman utama ("/"), sistem SHALL menampilkan navigasi sebagai topbar di seluruh lebar viewport (HP, tablet, laptop, PC) dan TIDAK PERNAH menampilkan mode sidebar.

#### Scenario: Guest di viewport tablet/PC tetap melihat topbar
- **WHEN** pengguna belum login membuka halaman "/" pada viewport 640px atau lebih lebar
- **THEN** navigasi tetap ditampilkan sebagai topbar inline ("Cek Status", "Masuk"), bukan sidebar

### Requirement: Sidebar SA dapat dibuka/ditutup (collapse ke icon-rail)
Pada mode sidebar (SA, viewport ≥640px), sistem SHALL menyediakan tombol toggle yang mengecilkan sidebar menjadi rail berisi ikon saja (tanpa label teks) atau mengembalikannya ke tampilan penuh (ikon + label), tanpa kehilangan akses navigasi saat rail dalam keadaan mengecil.

#### Scenario: Menutup sidebar ke icon-rail
- **WHEN** SA menekan tombol toggle saat sidebar dalam keadaan terbuka penuh
- **THEN** sidebar mengecil menjadi rail berisi ikon navigasi saja, dan tombol toggle tetap terlihat untuk membuka kembali

#### Scenario: Item navigasi tetap dapat diklik saat sidebar mengecil
- **WHEN** sidebar dalam keadaan mengecil (icon-rail)
- **THEN** setiap ikon navigasi tetap dapat diklik untuk berpindah halaman

### Requirement: Panel menu untuk SA di mode topbar
Ketika mode topbar aktif dan pengguna berstatus SA (authenticated) dengan lebih dari yang muat dalam satu baris, sistem SHALL menyediakan tombol toggle yang membuka panel berisi seluruh item navigasi SA, dengan target sentuh setiap item minimal 44x44px.

#### Scenario: Membuka panel menu SA di HP
- **WHEN** SA yang sudah login menekan tombol toggle navigasi pada mode topbar
- **THEN** panel menu terbuka menampilkan seluruh item navigasi SA (Cek Status, Dashboard, Servis, Riwayat, Mekanik, Akun, Keluar) dengan target sentuh ≥44px per item

#### Scenario: Navigasi guest tetap inline di mode topbar
- **WHEN** pengguna berstatus guest (belum login) membuka aplikasi pada mode topbar
- **THEN** item navigasi guest ("Cek Status", "Masuk") ditampilkan langsung inline di topbar tanpa tombol toggle/panel tambahan

### Requirement: Footer hanya tampil untuk pengguna belum login
Sistem SHALL menampilkan footer aplikasi untuk pengguna berstatus guest (belum login), secara utuh dan tanpa scroll horizontal di seluruh mode viewport. Sistem SHALL menyembunyikan footer sepenuhnya ketika pengguna berstatus authenticated (berhasil login).

#### Scenario: Footer tampil untuk guest
- **WHEN** pengguna belum login membuka aplikasi (mode topbar, viewport manapun)
- **THEN** footer tampil penuh di bagian bawah halaman tanpa terpotong atau tergeser akibat navigasi

#### Scenario: Footer disembunyikan setelah login
- **WHEN** pengguna berhasil login (status menjadi authenticated)
- **THEN** footer tidak lagi ditampilkan pada halaman manapun, baik mode topbar (HP) maupun mode sidebar (tablet/PC)

### Requirement: Posisi tombol aksi mengambang (FAB) aman dari UI sistem
Tombol aksi mengambang (floating action button) yang ditampilkan pada suatu halaman SHALL tetap berada dalam area aman viewport, tidak tertutup oleh UI sistem perangkat (mis. home-indicator iOS) maupun oleh panel navigasi mobile yang sedang terbuka.

#### Scenario: FAB tidak tertutup home-indicator
- **WHEN** halaman dengan FAB dibuka pada perangkat dengan area aman bawah (safe-area-inset-bottom) seperti iPhone dengan home-indicator
- **THEN** FAB diberi jarak tambahan dari tepi bawah viewport sehingga tidak tumpang tindih dengan home-indicator

#### Scenario: FAB tidak tertutup panel navigasi mobile
- **WHEN** panel menu navigasi mobile sedang terbuka pada halaman yang juga memiliki FAB
- **THEN** urutan tumpukan (z-index) elemen memastikan tidak ada tumpang-tindih yang membuat salah satu elemen tidak bisa diakses
