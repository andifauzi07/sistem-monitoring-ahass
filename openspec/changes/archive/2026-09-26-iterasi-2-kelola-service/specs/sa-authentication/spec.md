## MODIFIED Requirements

### Requirement: Navigasi sesuai status sesi

Header SHALL menampilkan tautan "Masuk" dalam keadaan `guest`. Dalam keadaan `authenticated`, header SHALL menampilkan tautan "Dashboard", tautan "Servis" (`/servis`), dan tombol "Keluar". Tautan "Cek Status" (`/`) SHALL selalu tampil.

#### Scenario: Header untuk tamu

- **WHEN** tamu membuka aplikasi
- **THEN** header menampilkan "Cek Status" dan "Masuk", tanpa "Dashboard", "Servis", maupun "Keluar"

#### Scenario: Header untuk Service Advisor

- **WHEN** Service Advisor yang sudah login membuka aplikasi
- **THEN** header menampilkan "Cek Status", "Dashboard", "Servis", dan "Keluar", tanpa "Masuk"
