-- =============================================================================
-- Iterasi 0 — Skema awal Sistem Monitoring Layanan Kendaraan AHASS Kota Mamuju
-- Rujukan: docs/PRD.md Bagian 7; openspec/changes/iterasi-0-setup/design.md
-- Aman dijalankan ulang (idempoten) di SQL Editor Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 Enum status & normalisasi nomor polisi
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_servis' and typnamespace = 'public'::regnamespace) then
    create type public.status_servis as enum (
      'Menunggu Antrian',
      'Diperiksa',
      'Dikerjakan',
      'Selesai Dikerjakan',
      'Sudah Diambil'
    );
  end if;
end
$$;

-- "dc 1234-ab" -> "DC1234AB". Padanan TypeScript: src/lib/nopol.ts
create or replace function public.normalize_nopol(nopol text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(nopol, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- -----------------------------------------------------------------------------
-- 4.2 service_advisors, mekanik, pelanggan
-- -----------------------------------------------------------------------------
create table if not exists public.service_advisors (
  id         uuid primary key references auth.users (id) on delete cascade,
  nama       text not null,
  email      text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.mekanik (
  id           uuid primary key default gen_random_uuid(),
  nama         text not null check (length(trim(nama)) > 0),
  status_hadir boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Satu baris per kendaraan; nama_pembawa & nomor_wa = kontak terakhir yang diketahui.
create table if not exists public.pelanggan (
  id           uuid primary key default gen_random_uuid(),
  nama_pembawa text not null,
  nomor_polisi text not null unique check (nomor_polisi <> ''),
  nomor_wa     text not null,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4.3 layanan_service (entitas inti)
-- nomor_polisi / nama_pembawa / nomor_wa = snapshot per kunjungan (design D6).
-- -----------------------------------------------------------------------------
create table if not exists public.layanan_service (
  id                 uuid primary key default gen_random_uuid(),
  nomor_polisi       text not null check (nomor_polisi <> ''),
  nama_pembawa       text not null,
  nomor_wa           text not null,
  jenis_motor        text not null,
  kilometer          integer not null check (kilometer >= 0),
  masalah            text not null,
  status             public.status_servis not null default 'Menunggu Antrian',
  service_advisor_id uuid not null references public.service_advisors (id),
  pelanggan_id       uuid not null references public.pelanggan (id),
  mekanik_id         uuid references public.mekanik (id),
  tanggal_masuk      timestamptz not null default now(),
  tanggal_selesai    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists layanan_service_status_idx        on public.layanan_service (status);
create index if not exists layanan_service_tanggal_masuk_idx on public.layanan_service (tanggal_masuk desc);
create index if not exists layanan_service_mekanik_id_idx    on public.layanan_service (mekanik_id);
create index if not exists layanan_service_nomor_polisi_idx  on public.layanan_service (nomor_polisi);
create index if not exists layanan_service_pelanggan_id_idx  on public.layanan_service (pelanggan_id);

-- -----------------------------------------------------------------------------
-- 4.4 Satu servis aktif per kendaraan (design D8)
-- -----------------------------------------------------------------------------
create unique index if not exists layanan_service_satu_aktif_per_pelanggan
  on public.layanan_service (pelanggan_id)
  where status <> 'Sudah Diambil';

-- -----------------------------------------------------------------------------
-- 4.5 Tabel log
-- -----------------------------------------------------------------------------
create table if not exists public.riwayat_status (
  id                 uuid primary key default gen_random_uuid(),
  layanan_service_id uuid not null references public.layanan_service (id) on delete cascade,
  status_baru        public.status_servis not null,
  diubah_oleh        uuid references public.service_advisors (id) on delete set null,
  waktu              timestamptz not null default now()
);

create index if not exists riwayat_status_layanan_idx
  on public.riwayat_status (layanan_service_id, waktu);

create table if not exists public.riwayat_penugasan_mekanik (
  id                 uuid primary key default gen_random_uuid(),
  layanan_service_id uuid not null references public.layanan_service (id) on delete cascade,
  mekanik_id         uuid not null references public.mekanik (id),
  ditugaskan_oleh    uuid references public.service_advisors (id) on delete set null,
  waktu              timestamptz not null default now()
);

create index if not exists riwayat_penugasan_layanan_idx
  on public.riwayat_penugasan_mekanik (layanan_service_id, waktu);
create index if not exists riwayat_penugasan_mekanik_idx
  on public.riwayat_penugasan_mekanik (mekanik_id);

-- -----------------------------------------------------------------------------
-- 4.6 Trigger
-- -----------------------------------------------------------------------------

-- auth.users -> service_advisors
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_advisors (id, nama, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nama'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Normalisasi nomor_polisi (pelanggan & layanan_service)
create or replace function public.set_normalized_nopol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nomor_polisi := public.normalize_nopol(new.nomor_polisi);
  return new;
end;
$$;

drop trigger if exists trg_normalize_nopol on public.pelanggan;
create trigger trg_normalize_nopol
  before insert or update of nomor_polisi on public.pelanggan
  for each row execute function public.set_normalized_nopol();

drop trigger if exists trg_normalize_nopol on public.layanan_service;
create trigger trg_normalize_nopol
  before insert or update of nomor_polisi on public.layanan_service
  for each row execute function public.set_normalized_nopol();

-- Log riwayat_status saat insert & saat status berubah (FR-3.4)
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.riwayat_status (layanan_service_id, status_baru, diubah_oleh)
  values (new.id, new.status, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_log_status_insert on public.layanan_service;
create trigger trg_log_status_insert
  after insert on public.layanan_service
  for each row execute function public.log_status_change();

drop trigger if exists trg_log_status on public.layanan_service;
create trigger trg_log_status
  after update of status on public.layanan_service
  for each row
  when (old.status is distinct from new.status)
  execute function public.log_status_change();

-- updated_at otomatis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at on public.layanan_service;
create trigger trg_set_updated_at
  before update on public.layanan_service
  for each row execute function public.set_updated_at();

-- Fungsi trigger tidak boleh dipanggil langsung lewat API
revoke all on function public.handle_new_user()    from public, anon, authenticated;
revoke all on function public.log_status_change()  from public, anon, authenticated;
revoke all on function public.set_normalized_nopol() from public, anon, authenticated;
revoke all on function public.set_updated_at()     from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4.7 Row Level Security: authenticated = akses penuh, anon = tidak ada
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'service_advisors', 'mekanik', 'pelanggan',
    'layanan_service', 'riwayat_status', 'riwayat_penugasan_mekanik'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('drop policy if exists "service advisor akses penuh" on public.%I', t);
    execute format(
      'create policy "service advisor akses penuh" on public.%I
         for all to authenticated using (true) with check (true)', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 4.8 RPC publik cek_status (FR-7.1/7.2) — tanpa nama, WA, keluhan, km, id
-- -----------------------------------------------------------------------------
create or replace function public.cek_status(nopol text)
returns table (
  nomor_polisi    text,
  jenis_motor     text,
  status          public.status_servis,
  tanggal_masuk   timestamptz,
  tanggal_selesai timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select ls.nomor_polisi, ls.jenis_motor, ls.status, ls.tanggal_masuk, ls.tanggal_selesai
  from public.layanan_service ls
  where length(public.normalize_nopol(nopol)) >= 3
    and ls.nomor_polisi = public.normalize_nopol(nopol)
  order by ls.tanggal_masuk desc
  limit 20;
$$;

revoke all on function public.cek_status(text) from public;
grant execute on function public.cek_status(text) to anon, authenticated;
