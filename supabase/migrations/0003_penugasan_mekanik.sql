-- =============================================================================
-- Iterasi 4b — Penugasan Mekanik ke Kendaraan (FR-5.6 s.d. FR-5.10)
-- Rujukan: docs/PRD.md Bagian 8.5.B, 10.4;
--          openspec/changes/iterasi-4b-penugasan-mekanik/design.md
-- Jalankan SETELAH 0001_init_schema.sql dan 0002_kelola_service.sql.
-- Aman dijalankan ulang (idempoten). Tidak ada kolom/tabel yang berubah —
-- layanan_service.mekanik_id dan riwayat_penugasan_mekanik sudah ada sejak 0001.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Validasi penugasan mekanik (design D2)
--    Ditegakkan di database agar berlaku untuk semua jalur akses, mengikuti
--    pola trg_aturan_layanan untuk transisi status.
-- -----------------------------------------------------------------------------
create or replace function public.aturan_penugasan_mekanik()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tersedia boolean;
begin
  if old.status in ('Selesai Dikerjakan', 'Sudah Diambil') then
    raise exception 'PENUGASAN_TERKUNCI'
      using detail = 'Penugasan mekanik tidak dapat diubah setelah servis selesai dikerjakan atau sudah diambil';
  end if;

  if new.mekanik_id is not null then
    select (is_active and status_hadir) into v_tersedia
    from public.mekanik
    where id = new.mekanik_id;

    if v_tersedia is not true then
      raise exception 'MEKANIK_TIDAK_TERSEDIA'
        using detail = 'Mekanik harus berstatus aktif dan hadir untuk dapat ditugaskan';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_aturan_penugasan_mekanik on public.layanan_service;
create trigger trg_aturan_penugasan_mekanik
  before update of mekanik_id on public.layanan_service
  for each row execute function public.aturan_penugasan_mekanik();

-- -----------------------------------------------------------------------------
-- 2. Log penugasan mekanik otomatis (design D3, FR-5.9)
--    riwayat_penugasan_mekanik TIDAK ditulis dari kode frontend, sama seperti
--    riwayat_status.
-- -----------------------------------------------------------------------------
create or replace function public.log_penugasan_mekanik()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.riwayat_penugasan_mekanik (layanan_service_id, mekanik_id, ditugaskan_oleh)
  values (new.id, new.mekanik_id, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_log_penugasan_mekanik on public.layanan_service;
create trigger trg_log_penugasan_mekanik
  after update of mekanik_id on public.layanan_service
  for each row
  when (new.mekanik_id is not null and old.mekanik_id is distinct from new.mekanik_id)
  execute function public.log_penugasan_mekanik();

-- -----------------------------------------------------------------------------
-- 3. Cegah nonaktifkan mekanik yang masih bertugas (design D4)
-- -----------------------------------------------------------------------------
create or replace function public.cegah_nonaktifkan_mekanik_bertugas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.layanan_service
    where mekanik_id = old.id
      and status <> 'Sudah Diambil'
  ) then
    raise exception 'MEKANIK_MASIH_BERTUGAS'
      using detail = 'Mekanik ini masih menangani kendaraan aktif';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cegah_nonaktifkan_mekanik on public.mekanik;
create trigger trg_cegah_nonaktifkan_mekanik
  before update of is_active on public.mekanik
  for each row
  when (new.is_active = false)
  execute function public.cegah_nonaktifkan_mekanik_bertugas();

-- -----------------------------------------------------------------------------
-- 4. Fungsi trigger tidak boleh dipanggil langsung lewat API
-- -----------------------------------------------------------------------------
revoke all on function public.aturan_penugasan_mekanik()          from public, anon, authenticated;
revoke all on function public.log_penugasan_mekanik()              from public, anon, authenticated;
revoke all on function public.cegah_nonaktifkan_mekanik_bertugas() from public, anon, authenticated;
