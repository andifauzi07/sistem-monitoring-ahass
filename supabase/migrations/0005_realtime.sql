-- =============================================================================
-- Iterasi 6 — Realtime Update (FR-3.4, FR-7.3)
-- Rujukan: openspec/changes/iterasi-6-realtime/design.md (D2, D3)
-- Jalankan SETELAH 0001–0004. Aman dijalankan ulang (idempoten).
-- Tidak mengubah kolom, RLS, maupun RPC cek_status.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Publication untuk SA (postgres_changes, tunduk RLS → hanya authenticated)
-- -----------------------------------------------------------------------------
do $$
declare
  tabel text;
begin
  foreach tabel in array array['layanan_service', 'mekanik'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tabel
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tabel);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Sinyal broadcast publik per nopol (halaman pelanggan, role anon)
--    Payload selalu kosong: data tetap diambil lewat cek_status (design D1).
-- -----------------------------------------------------------------------------
create or replace function public.siarkan_perubahan_servis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    if tg_op = 'INSERT' then
      perform realtime.send('{}'::jsonb, 'berubah', 'servis:' || new.nomor_polisi, false);

    elsif tg_op = 'DELETE' then
      perform realtime.send('{}'::jsonb, 'berubah', 'servis:' || old.nomor_polisi, false);

    elsif new.status          is distinct from old.status
       or new.nomor_polisi    is distinct from old.nomor_polisi
       or new.jenis_motor     is distinct from old.jenis_motor
       or new.tanggal_masuk   is distinct from old.tanggal_masuk
       or new.tanggal_selesai is distinct from old.tanggal_selesai then
      perform realtime.send('{}'::jsonb, 'berubah', 'servis:' || new.nomor_polisi, false);
      if new.nomor_polisi is distinct from old.nomor_polisi then
        perform realtime.send('{}'::jsonb, 'berubah', 'servis:' || old.nomor_polisi, false);
      end if;
    end if;
  exception when others then
    -- Realtime best-effort: jangan pernah menggagalkan transaksi SA.
    raise warning 'siarkan_perubahan_servis gagal: %', sqlerrm;
  end;

  return null;
end;
$$;

drop trigger if exists trg_siarkan_perubahan_servis on public.layanan_service;
create trigger trg_siarkan_perubahan_servis
  after insert or update or delete on public.layanan_service
  for each row execute function public.siarkan_perubahan_servis();

revoke all on function public.siarkan_perubahan_servis() from public, anon, authenticated;
