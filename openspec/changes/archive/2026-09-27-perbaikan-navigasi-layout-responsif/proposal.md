## Why

Navigasi utama (`src/components/Layout.tsx`) memasang seluruh item menu SA (Cek Status, Dashboard, Servis, Riwayat, Mekanik, Akun, Keluar) dalam satu baris flex tanpa wrap atau menu alternatif. Di layar HP, baris ini overflow secara horizontal, memaksa seluruh halaman bisa di-scroll ke samping — efek sampingnya, footer dan tombol FAB "Tambah Mekanik" (`fixed bottom-6 right-6` di `MekanikPage.tsx`) yang sebenarnya sudah cukup responsif jadi terlihat salah posisi karena elemen `fixed` tetap menempel ke viewport sementara dokumen bergeser. Perbaikan ini perlu dilakukan sekarang karena mengganggu penggunaan aplikasi di HP, sebelum lanjut ke Iterasi 4b.

## What Changes

- Ganti shell navigasi `Layout.tsx` menjadi dua mode berdasarkan breakpoint Tailwind `sm` (640px), konsisten dengan breakpoint yang sudah dipakai footer saat ini:
  - **SA (authenticated)**: < 640px (HP) topbar dengan tombol hamburger yang membuka panel berisi daftar nav (6 item), target sentuh ≥44px; ≥ 640px (tablet & laptop/PC) sidebar di kiri (ikon + label) dengan **toggle untuk mengecilkan sidebar ke icon-rail** atau membesarkannya kembali.
  - **Guest/publik (belum login, termasuk halaman "/")**: nav inline biasa di topbar ("Cek Status" + "Masuk") di **seluruh lebar layar** — tidak pernah mendapat sidebar, bahkan di tablet/laptop/PC.
- Footer **hanya tampil untuk guest/belum login**; disembunyikan sepenuhnya begitu pengguna berhasil login (authenticated), di semua lebar layar.
- Tombol FAB "Tambah Mekanik" (`MekanikPage.tsx`) mendapat jarak aman dari tepi bawah (safe-area-inset) agar tidak mepet home-indicator di iPhone, dan z-index-nya disesuaikan agar tidak tertutup panel nav mobile.
- Tidak ada perubahan rute, state machine servis, field data, atau integrasi backend.

## Capabilities

### New Capabilities
- `app-shell`: kerangka navigasi & layout aplikasi (header/topbar, sidebar, footer) yang beradaptasi antara mode HP (topbar + panel menu) dan mode tablet/laptop/PC (sidebar persisten), termasuk penempatan tombol aksi mengambang (FAB) agar tidak tertutup UI sistem (home-indicator) atau elemen shell lainnya.

### Modified Capabilities
_(tidak ada — perubahan ini murni struktur shell/UI, tidak mengubah requirement fungsional capability yang sudah ada seperti `mekanik-management` atau `sa-dashboard`)_

## Impact

- `src/components/Layout.tsx` — restrukturisasi total: dari satu `<nav>` inline menjadi shell dua-mode (topbar+panel mobile / sidebar desktop).
- `src/pages/MekanikPage.tsx` — penyesuaian class FAB (safe-area padding, z-index).
- Tidak ada perubahan skema database, RPC, atau tipe TypeScript (`src/types/database.ts`).
- Tidak ada penambahan dependency baru (ikon hamburger/close bisa pakai `lucide-react` yang sudah terpasang).
