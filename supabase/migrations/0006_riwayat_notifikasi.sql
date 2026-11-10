-- =============================================================================
-- Iterasi 7 — Notifikasi WhatsApp Pelanggan (FR-7.4)
-- Rujukan: openspec/changes/iterasi-7-notifikasi-whatsapp/design.md
--          openspec/changes/iterasi-7-notifikasi-whatsapp/specs/database-schema/spec.md
-- Jalankan SETELAH 0001–0005. Aman dijalankan ulang (idempoten).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabel riwayat_notifikasi
-- -----------------------------------------------------------------------------
create table if not exists public.riwayat_notifikasi (
  id uuid primary key default gen_random_uuid(),
  layanan_service_id uuid not null references public.layanan_service(id) on delete cascade,
  nomor_tujuan text not null,
  pesan text not null,
  status text not null check (status in ('berhasil', 'gagal')),
  respons_gateway text,
  id_pesan_gateway text,
  dibuat_pada timestamptz not null default now()
);

-- Indeks pencarian riwayat per layanan dan urutan waktu
create index if not exists idx_riwayat_notifikasi_layanan_service_id
  on public.riwayat_notifikasi (layanan_service_id);

create index if not exists idx_riwayat_notifikasi_dibuat_pada
  on public.riwayat_notifikasi (dibuat_pada desc);

-- -----------------------------------------------------------------------------
-- 2. Row Level Security: authenticated = akses penuh, anon = tidak ada
-- -----------------------------------------------------------------------------
alter table public.riwayat_notifikasi enable row level security;

revoke all on table public.riwayat_notifikasi from anon;

drop policy if exists "service advisor akses penuh" on public.riwayat_notifikasi;
create policy "service advisor akses penuh" on public.riwayat_notifikasi
  for all to authenticated using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 3. Publication supabase_realtime untuk tabel riwayat_notifikasi
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'riwayat_notifikasi'
    ) then
      alter publication supabase_realtime add table public.riwayat_notifikasi;
    end if;
  end if;
end;
$$;
