-- =============================================================================
-- Iterasi 4b (tambahan) — Wajib tugaskan mekanik sebelum status maju ke Diperiksa
-- Rujukan: openspec/changes/iterasi-4b-penugasan-mekanik/design.md (D9b)
-- Jalankan SETELAH 0001, 0002, dan 0003. Aman dijalankan ulang (idempoten).
-- Migrasi terpisah dari 0003 karena 0003 sudah dijalankan sebelumnya.
-- =============================================================================

create or replace function public.cegah_maju_tanpa_mekanik()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'Menunggu Antrian' and new.status = 'Diperiksa' and new.mekanik_id is null then
    raise exception 'MEKANIK_BELUM_DITUGASKAN'
      using detail = 'Tugaskan mekanik terlebih dahulu sebelum memindahkan status ke Diperiksa';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cegah_maju_tanpa_mekanik on public.layanan_service;
create trigger trg_cegah_maju_tanpa_mekanik
  before update of status on public.layanan_service
  for each row execute function public.cegah_maju_tanpa_mekanik();

revoke all on function public.cegah_maju_tanpa_mekanik() from public, anon, authenticated;
