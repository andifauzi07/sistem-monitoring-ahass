-- =============================================================================
-- Iterasi 2 — Kelola Service (FR-3.1 s.d. FR-3.5)
-- Rujukan: docs/PRD.md Bagian 8.3; openspec/changes/iterasi-2-kelola-service/design.md
-- Jalankan SETELAH 0001_init_schema.sql. Aman dijalankan ulang (idempoten).
-- Tidak ada kolom/data yang berubah: hanya trigger dan fungsi baru.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Aturan status & tanggal_selesai (design D1)
--    Dijalankan BEFORE INSERT/UPDATE sehingga berlaku untuk semua jalur akses.
-- -----------------------------------------------------------------------------
create or replace function public.aturan_layanan_service()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  urutan    public.status_servis[] := enum_range(null::public.status_servis);
  pos_lama  integer;
  pos_baru  integer;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'Menunggu Antrian' then
      raise exception 'TRANSISI_STATUS_TIDAK_VALID'
        using detail = 'Servis baru harus berstatus Menunggu Antrian';
    end if;
    new.tanggal_selesai := null;
    return new;
  end if;

  -- UPDATE
  if old.status = 'Sudah Diambil' then
    raise exception 'SERVIS_TERKUNCI'
      using detail = 'Servis yang sudah diambil tidak dapat diubah';
  end if;

  if new.status is distinct from old.status then
    pos_lama := array_position(urutan, old.status);
    pos_baru := array_position(urutan, new.status);
    if abs(pos_baru - pos_lama) <> 1 then
      raise exception 'TRANSISI_STATUS_TIDAK_VALID'
        using detail = format('%s -> %s', old.status, new.status);
    end if;

    if old.status = 'Dikerjakan' and new.status = 'Selesai Dikerjakan' then
      new.tanggal_selesai := now();
    elsif old.status = 'Selesai Dikerjakan' and new.status = 'Dikerjakan' then
      new.tanggal_selesai := null;
    else
      new.tanggal_selesai := old.tanggal_selesai;
    end if;
  else
    -- tanggal_selesai sepenuhnya dikelola trigger ini; tidak bisa diisi manual
    new.tanggal_selesai := old.tanggal_selesai;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_aturan_layanan on public.layanan_service;
create trigger trg_aturan_layanan
  before insert or update on public.layanan_service
  for each row execute function public.aturan_layanan_service();

-- Hapus hanya saat Menunggu Antrian (FR-3.5)
create or replace function public.cegah_hapus_layanan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'Menunggu Antrian' then
    raise exception 'HAPUS_TIDAK_DIIZINKAN'
      using detail = 'Hanya servis berstatus Menunggu Antrian yang dapat dihapus';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_cegah_hapus_layanan on public.layanan_service;
create trigger trg_cegah_hapus_layanan
  before delete on public.layanan_service
  for each row execute function public.cegah_hapus_layanan();

-- -----------------------------------------------------------------------------
-- 2. Validasi & pembersihan input (design D4) — dipakai bersama oleh RPC
--    Padanan TypeScript: src/lib/servisValidation.ts
-- -----------------------------------------------------------------------------
create or replace function public.bersihkan_input_servis(
  p_nomor_polisi text,
  p_nama_pembawa text,
  p_nomor_wa     text,
  p_jenis_motor  text,
  p_kilometer    integer,
  p_masalah      text,
  out nomor_polisi text,
  out nama_pembawa text,
  out nomor_wa     text,
  out jenis_motor  text,
  out kilometer    integer,
  out masalah      text
)
returns record
language plpgsql
immutable
set search_path = ''
as $$
begin
  nomor_polisi := public.normalize_nopol(p_nomor_polisi);
  if length(nomor_polisi) not between 3 and 10 then
    raise exception 'DATA_TIDAK_VALID' using detail = 'nomor_polisi';
  end if;

  nama_pembawa := trim(coalesce(p_nama_pembawa, ''));
  if nama_pembawa = '' then
    raise exception 'DATA_TIDAK_VALID' using detail = 'nama_pembawa';
  end if;

  nomor_wa := regexp_replace(coalesce(p_nomor_wa, ''), '[\s.-]', '', 'g');
  if nomor_wa !~ '^\+?[0-9]{9,15}$' then
    raise exception 'DATA_TIDAK_VALID' using detail = 'nomor_wa';
  end if;

  jenis_motor := trim(coalesce(p_jenis_motor, ''));
  if jenis_motor = '' then
    raise exception 'DATA_TIDAK_VALID' using detail = 'jenis_motor';
  end if;

  if p_kilometer is null or p_kilometer < 0 then
    raise exception 'DATA_TIDAK_VALID' using detail = 'kilometer';
  end if;
  kilometer := p_kilometer;

  masalah := trim(coalesce(p_masalah, ''));
  if masalah = '' or length(masalah) > 1000 then
    raise exception 'DATA_TIDAK_VALID' using detail = 'masalah';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. RPC (SECURITY INVOKER: RLS dan auth.uid() tetap berlaku) — design D3
-- -----------------------------------------------------------------------------

-- FR-3.1 Tambah servis baru
create or replace function public.daftar_servis(
  p_nomor_polisi text,
  p_nama_pembawa text,
  p_nomor_wa     text,
  p_jenis_motor  text,
  p_kilometer    integer,
  p_masalah      text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_in    record;
  v_aktif uuid;
  v_pel   uuid;
  v_id    uuid;
begin
  select * into v_in from public.bersihkan_input_servis(
    p_nomor_polisi, p_nama_pembawa, p_nomor_wa, p_jenis_motor, p_kilometer, p_masalah);

  -- Cek servis aktif sebelum upsert agar kontak pelanggan tidak berubah bila gagal
  select ls.id into v_aktif
  from public.layanan_service ls
  join public.pelanggan p on p.id = ls.pelanggan_id
  where p.nomor_polisi = v_in.nomor_polisi
    and ls.status <> 'Sudah Diambil'
  limit 1;

  if v_aktif is not null then
    raise exception 'SERVIS_AKTIF_ADA' using detail = v_aktif::text;
  end if;

  insert into public.pelanggan (nomor_polisi, nama_pembawa, nomor_wa)
  values (v_in.nomor_polisi, v_in.nama_pembawa, v_in.nomor_wa)
  on conflict (nomor_polisi) do update
    set nama_pembawa = excluded.nama_pembawa,
        nomor_wa     = excluded.nomor_wa
  returning id into v_pel;

  insert into public.layanan_service (
    nomor_polisi, nama_pembawa, nomor_wa, jenis_motor, kilometer, masalah,
    service_advisor_id, pelanggan_id)
  values (
    v_in.nomor_polisi, v_in.nama_pembawa, v_in.nomor_wa, v_in.jenis_motor, v_in.kilometer, v_in.masalah,
    auth.uid(), v_pel)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    -- Balapan dengan tablet lain: servis aktif baru saja dibuat
    select ls.id into v_aktif
    from public.layanan_service ls
    join public.pelanggan p on p.id = ls.pelanggan_id
    where p.nomor_polisi = v_in.nomor_polisi
      and ls.status <> 'Sudah Diambil'
    limit 1;
    raise exception 'SERVIS_AKTIF_ADA' using detail = coalesce(v_aktif::text, '');
end;
$$;

-- FR-3.2 Edit layanan (semua field data kecuali status)
create or replace function public.ubah_servis(
  p_id           uuid,
  p_nomor_polisi text,
  p_nama_pembawa text,
  p_nomor_wa     text,
  p_jenis_motor  text,
  p_kilometer    integer,
  p_masalah      text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_ls    public.layanan_service%rowtype;
  v_in    record;
  v_pel   uuid;
  v_aktif uuid;
begin
  select * into v_ls from public.layanan_service where id = p_id for update;
  if not found then
    raise exception 'SERVIS_TIDAK_DITEMUKAN';
  end if;
  if v_ls.status = 'Sudah Diambil' then
    raise exception 'SERVIS_TERKUNCI'
      using detail = 'Servis yang sudah diambil tidak dapat diubah';
  end if;

  select * into v_in from public.bersihkan_input_servis(
    p_nomor_polisi, p_nama_pembawa, p_nomor_wa, p_jenis_motor, p_kilometer, p_masalah);

  if v_in.nomor_polisi = v_ls.nomor_polisi then
    -- Nopol sama: perbarui kontak pelanggan
    v_pel := v_ls.pelanggan_id;
    update public.pelanggan
       set nama_pembawa = v_in.nama_pembawa,
           nomor_wa     = v_in.nomor_wa
     where id = v_pel;
  else
    -- Koreksi nopol: sambungkan ke pelanggan yang sesuai
    select ls.id into v_aktif
    from public.layanan_service ls
    join public.pelanggan p on p.id = ls.pelanggan_id
    where p.nomor_polisi = v_in.nomor_polisi
      and ls.status <> 'Sudah Diambil'
      and ls.id <> p_id
    limit 1;
    if v_aktif is not null then
      raise exception 'SERVIS_AKTIF_ADA' using detail = v_aktif::text;
    end if;

    insert into public.pelanggan (nomor_polisi, nama_pembawa, nomor_wa)
    values (v_in.nomor_polisi, v_in.nama_pembawa, v_in.nomor_wa)
    on conflict (nomor_polisi) do update
      set nama_pembawa = excluded.nama_pembawa,
          nomor_wa     = excluded.nomor_wa
    returning id into v_pel;
  end if;

  update public.layanan_service
     set nomor_polisi = v_in.nomor_polisi,
         nama_pembawa = v_in.nama_pembawa,
         nomor_wa     = v_in.nomor_wa,
         jenis_motor  = v_in.jenis_motor,
         kilometer    = v_in.kilometer,
         masalah      = v_in.masalah,
         pelanggan_id = v_pel
   where id = p_id;

  -- Pelanggan lama (hasil salah ketik) dibersihkan bila tidak dirujuk layanan mana pun
  if v_pel <> v_ls.pelanggan_id then
    delete from public.pelanggan
     where id = v_ls.pelanggan_id
       and not exists (
         select 1 from public.layanan_service where pelanggan_id = v_ls.pelanggan_id);
  end if;
exception
  when unique_violation then
    raise exception 'SERVIS_AKTIF_ADA' using detail = coalesce(v_aktif::text, '');
end;
$$;

-- FR-3.5 Hapus layanan (trigger trg_cegah_hapus_layanan menegakkan aturan status)
create or replace function public.hapus_servis(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_pel uuid;
begin
  select pelanggan_id into v_pel from public.layanan_service where id = p_id;
  if not found then
    raise exception 'SERVIS_TIDAK_DITEMUKAN';
  end if;

  delete from public.layanan_service where id = p_id;

  delete from public.pelanggan
   where id = v_pel
     and not exists (select 1 from public.layanan_service where pelanggan_id = v_pel);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Hak akses: fungsi trigger tidak boleh dipanggil lewat API;
--    RPC hanya untuk authenticated (anon tidak bisa).
-- -----------------------------------------------------------------------------
revoke all on function public.aturan_layanan_service() from public, anon, authenticated;
revoke all on function public.cegah_hapus_layanan()    from public, anon, authenticated;

revoke all on function public.bersihkan_input_servis(text, text, text, text, integer, text)
  from public, anon;
grant execute on function public.bersihkan_input_servis(text, text, text, text, integer, text)
  to authenticated;

revoke all on function public.daftar_servis(text, text, text, text, integer, text)
  from public, anon;
grant execute on function public.daftar_servis(text, text, text, text, integer, text)
  to authenticated;

revoke all on function public.ubah_servis(uuid, text, text, text, text, integer, text)
  from public, anon;
grant execute on function public.ubah_servis(uuid, text, text, text, text, integer, text)
  to authenticated;

revoke all on function public.hapus_servis(uuid) from public, anon;
grant execute on function public.hapus_servis(uuid) to authenticated;
