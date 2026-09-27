## Context

`src/components/Layout.tsx` saat ini adalah satu komponen shell (`header` + `main` + `footer`) yang dipakai oleh semua route lewat `<Outlet />`. Header berisi satu `<nav>` inline (`flex shrink-0 items-center gap-1`) yang memuat seluruh item menu tanpa mekanisme wrap atau collapse. Untuk SA (authenticated) ada 6 item (Dashboard, Servis, Riwayat, Mekanik, Akun, Keluar) + link "Cek Status"; untuk guest hanya 2 item ("Cek Status", "Masuk"). Di layar HP, 6+ item ini overflow horizontal, dan overflow tersebut menyeret footer serta FAB `fixed` di `MekanikPage.tsx` sehingga terlihat salah posisi meski class masing-masing sebenarnya sudah cukup responsif.

Aplikasi ini dipakai SA terutama di tablet (keputusan Iterasi 2: "UI dioptimalkan untuk tablet"), dan sekarang juga perlu nyaman dipakai di HP serta laptop/PC.

## Goals / Non-Goals

**Goals:**
- Navigasi SA tidak overflow di layar manapun, dari HP (~360px) sampai desktop lebar.
- Mode HP (< 640px): topbar + panel menu (hamburger) untuk SA; nav inline biasa untuk guest — berlaku di semua lebar layar untuk guest (lihat Decision 3).
- Mode tablet/laptop/PC (≥ 640px), khusus SA (authenticated): sidebar kiri, ikon + label, dengan toggle untuk mengecilkan (icon-only) atau membesarkan kembali.
- Guest/belum login (termasuk halaman "/") tidak pernah mendapat sidebar di lebar layar manapun — hanya topbar.
- Footer hanya tampil untuk guest/belum login; disembunyikan sepenuhnya begitu pengguna berhasil login (authenticated).
- Footer dan FAB tidak lagi terpengaruh overflow horizontal dari nav.
- Tidak mengubah rute, hak akses, atau perilaku fungsional lain di luar shell/layout.

**Non-Goals:**
- Bottom tab bar ala aplikasi native untuk HP — pengguna secara eksplisit meminta topbar, bukan bottom nav.
- Redesign visual (warna, branding) di luar penataan ulang struktur nav/sidebar.
- Mengubah pola FAB di halaman lain (belum ada FAB lain saat ini; Iterasi 4b nanti bisa menambah FAB baru dan akan mengikuti pola yang ditetapkan di sini).
- Menyimpan preferensi collapse sidebar lintas sesi (localStorage) — state toggle cukup bertahan selama sesi SPA berjalan (tidak reset saat pindah rute, karena `Layout` tidak unmount lewat `<Outlet />`), reset saat reload penuh.

## Decisions

**1. Breakpoint mode: Tailwind `sm` (640px), bukan `md` (768px).**
`Layout.tsx` sudah memakai `sm:flex-row` pada footer untuk keputusan "HP vs lebih besar". Memakai `sm` lagi untuk nav menjaga konsistensi satu breakpoint switch-point di seluruh shell, dan tidak menambah breakpoint baru yang perlu diingat saat maintenance.

**2. Mode HP untuk SA: topbar + panel dropdown (bukan full-screen drawer/overlay).**
Alternatif yang dipertimbangkan: (a) full-screen overlay drawer ala aplikasi native, (b) panel/dropdown yang muncul di bawah topbar tanpa menutup seluruh layar. Dipilih (b) karena hanya 6 item nav — panel pendek sudah cukup, tidak perlu animasi slide-in/backdrop yang lebih kompleks. Tombol toggle pakai ikon `Menu`/`X` dari `lucide-react` (sudah dipakai di `MekanikPage.tsx`).

**3. Guest/belum login: topbar di semua lebar layar, tidak pernah sidebar.**
Direvisi dari keputusan awal (guest ikut mode sidebar di ≥640px). Guest hanya punya 2 item ("Cek Status", "Masuk") yang tetap muat inline di topbar bahkan di lebar desktop — memberi guest sidebar penuh untuk 2 item boros ruang tanpa manfaat, dan `<aside>` sekarang hanya dirender ketika `status === 'authenticated'`. Header mobile (`sm:hidden` untuk SA) menjadi tidak punya pembatas breakpoint sama sekali untuk guest, sehingga topbar guest konsisten dari HP sampai PC — termasuk di halaman "/" yang menjadi entry point utama pengguna belum login.

**3a. Bug: `sm:flex-row` pada wrapper harus bersyarat, bukan selalu aktif.**
Setelah Decision 3 diterapkan, muncul bug nyata: div pembungkus `<aside>`+`<header>`+kolom konten memakai `sm:flex-row` tanpa syarat. Untuk guest, `<aside>` memang tidak dirender, tapi `<header>`-nya tetap ada di DOM dan sengaja tidak diberi `sm:hidden` (Decision 3). Akibatnya di ≥640px, `<header>` guest ikut menjadi flex item dalam kontainer row bersama kolom konten — karena flex item tidak otomatis melebar penuh pada arah utama (row), header menyusut mengikuti lebar kontennya sendiri dan duduk sebagai kolom sempit di kiri, persis terlihat seperti sidebar, padahal itu topbar yang "terjepit". Diperbaiki dengan membuat `sm:flex-row` bersyarat pada `isAuthenticated`: guest tetap `flex-col` di semua lebar layar (header selalu full-width horizontal di atas), SA tetap dapat `sm:flex-row` (sidebar+konten berdampingan) seperti Decision 4.

**4. Mode tablet/PC untuk SA: sidebar dengan toggle collapse ke icon-rail (bukan hilang total).**
Direvisi dari keputusan awal ("tanpa collapse"). Toggle (ikon `PanelLeftClose`/`PanelLeftOpen` dari `lucide-react`) ditaruh di baris brand paling atas sidebar, sehingga selalu ada di posisi yang sama baik saat expanded maupun collapsed. Alternatif yang dipertimbangkan: (a) sidebar hilang total (width 0) saat "ditutup" — ditolak karena butuh affordance terpisah (mis. topbar tambahan di kolom konten) untuk membukanya kembali, menambah kompleksitas struktur; (b) collapse ke icon-rail (~4rem, ikon saja + `title` sebagai tooltip) — dipilih karena toggle tetap berada di sidebar itu sendiri (tidak butuh elemen UI tambahan) dan nav tetap fungsional (bisa diklik) saat collapsed.

**5. Footer: hanya tampil untuk guest/belum login, disembunyikan total saat authenticated.**
Direvisi dari keputusan awal ("footer full-width di bawah semuanya, termasuk di bawah sidebar"). Karena sidebar (Decision 4) kini eksklusif untuk authenticated dan footer kini eksklusif untuk guest, kombinasi "sidebar + footer tampil bersamaan" tidak pernah terjadi lagi — pertanyaan "footer di bawah sidebar atau tidak" jadi tidak relevan. Footer dirender dengan syarat `!isAuthenticated` di `Layout.tsx`.

**6a. (DIBATALKAN) Sidebar disembunyikan pada rute "/" (Cek Status) dan "/login" untuk SA.**
Sempat diimplementasikan (`NO_SIDEBAR_PATHS = ['/', '/login']` + `showSidebar` berbasis rute), lalu **dibatalkan atas permintaan pengguna** setelah laporan "sidebar tetap muncul di halaman / sebelum login" ternyata tidak bisa direproduksi lewat penelusuran kode (logikanya sudah benar secara struktur — `showSidebar` selalu `false` di rute tersebut terlepas status login). Daripada berlama-lama memverifikasi kemungkinan cache/stale build, pengguna memilih membatalkan fitur ini. **Keputusan final: sidebar SA tampil di semua rute authenticated (termasuk "/"), sama seperti Decision 4** — tidak ada pengecualian berbasis rute.

**6. Sidebar SA: tinggi mengikuti viewport (`sticky top-0 h-dvh`), tidak ikut scroll bersama konten.**
Ditambahkan `sm:sticky sm:top-0 sm:h-dvh sm:self-start` pada `<aside>`. `self-start` diperlukan supaya sidebar tidak ikut di-stretch oleh `align-items: stretch` bawaan flex row (yang sebelumnya membuat tinggi sidebar mengikuti tinggi kolom konten, bukan tinggi layar) — dengan `self-start`, `h-dvh` bisa berlaku penuh dan `sticky top-0` menahannya tetap terlihat saat konten discroll. Nav internal sidebar diberi `overflow-y-auto` sebagai fallback bila suatu saat item nav bertambah banyak di viewport pendek. Tidak dipakai `position: fixed` karena `sticky` lebih sederhana di sini (sidebar sudah jadi elemen pertama yang terlihat di alur dokumen untuk SA, karena header mobile disembunyikan lewat `sm:hidden`) dan tidak perlu penyesuaian margin/padding tambahan pada kolom konten seperti yang dibutuhkan `fixed`.

**7. FAB (`MekanikPage.tsx`): tambah `padding-bottom: env(safe-area-inset-bottom)` dan naikkan/pastikan z-index di atas panel mobile nav.**
`env(safe-area-inset-bottom)` adalah pendekatan CSS standar untuk menghindari overlap dengan home-indicator iOS, tidak butuh library tambahan. Karena panel nav mobile (poin 2) sekarang bisa muncul sebagai overlay pendek dari topbar, FAB perlu z-index yang dikoordinasikan supaya tidak saling menutupi saat keduanya kebetulan terbuka bersamaan.

## Risks / Trade-offs

- **[Risk]** Sidebar di tablet portrait (≥640px tapi sempit, mis. 640–767px) bisa terasa sempit untuk konten tabel → **Mitigasi**: tabel yang ada sudah memakai `overflow-x-auto`, dan pengguna bisa menutup sidebar ke icon-rail lewat toggle (Decision 4) untuk melapangkan konten.
- **[Risk]** Mengubah `Layout.tsx` adalah perubahan struktural yang menyentuh seluruh halaman (dipakai lewat `<Outlet />`) → **Mitigasi**: tidak ada perubahan pada `<main>`/`<Outlet />` itu sendiri atau halaman anak; hanya wrapper header/nav/footer yang berubah, sehingga risiko regresi per-halaman rendah. Tetap perlu `npm run build` dan cek visual manual di beberapa breakpoint sebelum change dianggap selesai.
- **[Risk]** Tanpa breakpoint test di browser nyata, ukuran breakpoint `sm` (640px) mungkin masih terasa terlalu sempit/lebar di device tertentu → **Mitigasi**: ini keputusan desain yang bisa disesuaikan belakangan tanpa mengubah arsitektur (tinggal ganti kelas Tailwind), bukan keputusan struktural yang mahal untuk diubah.

## Migration Plan

Tidak ada migrasi data/skema. Langkah rollout:
1. Implementasi ulang `Layout.tsx` menjadi shell dua-mode.
2. Sesuaikan class FAB di `MekanikPage.tsx`.
3. `npm run build` harus lolos.
4. Uji manual oleh pengguna di beberapa lebar viewport (HP, tablet, desktop) — dicatat sebagai tugas pengguna di `tasks.md`, bukan diklaim selesai oleh agent.
Rollback: revert commit `Layout.tsx`/`MekanikPage.tsx` ke versi sebelumnya (tidak ada dependency baru atau perubahan data yang perlu di-reverse).

## Open Questions

_(tidak ada — keputusan yang dibutuhkan untuk mulai implementasi sudah diputuskan di atas dan dikonfirmasi pengguna di sesi eksplorasi)_
