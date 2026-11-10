// Supabase Edge Function: kirim-wa
// Rujukan: openspec/changes/iterasi-7-notifikasi-whatsapp/design.md
//          openspec/changes/iterasi-7-notifikasi-whatsapp/specs/whatsapp-notification/spec.md

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  normalisasiNomorWa,
  isValidNomorWa,
  susunTemplatePesan,
  formatTanggalWaktuWITA,
} from '../_shared/wa.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Header Authorization tidak ditemukan' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabasePublishableKey =
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      ''
    const supabaseSecretKey =
      Deno.env.get('SUPABASE_SECRET_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      ''

    // Verifikasi identitas pemanggil (User JWT atau Secret / Service Role Key)
    let isAuthorized = false
    if (supabaseSecretKey && token === supabaseSecretKey) {
      isAuthorized = true
    } else {
      const authClient = createClient(supabaseUrl, supabasePublishableKey)
      const { data: { user }, error: authError } = await authClient.auth.getUser(token)
      if (!authError && user) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Sesi Service Advisor tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Client database (gunakan secret/service role jika tersedia agar insert riwayat tetap andal)
    const dbClient = supabaseSecretKey
      ? createClient(supabaseUrl, supabaseSecretKey)
      : createClient(supabaseUrl, supabasePublishableKey, {
          global: { headers: { Authorization: authHeader } },
        })

    const body = await req.json().catch(() => ({}))
    const layanan_service_id = body.layanan_service_id

    if (!layanan_service_id || typeof layanan_service_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Parameter layanan_service_id wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Ambil data servis dan mekanik
    const { data: servis, error: errServis } = await dbClient
      .from('layanan_service')
      .select('id, nomor_polisi, nama_pembawa, nomor_wa, jenis_motor, masalah, status, tanggal_selesai, mekanik:mekanik_id(nama)')
      .eq('id', layanan_service_id)
      .maybeSingle()

    if (errServis || !servis) {
      return new Response(
        JSON.stringify({ success: false, error: 'Data layanan servis tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const nomorTujuan = normalisasiNomorWa(servis.nomor_wa)
    const appPublicUrl = (Deno.env.get('APP_PUBLIC_URL') || 'https://monitoring-ahass-mamuju.vercel.app').replace(/\/$/, '')
    const urlMonitoring = `${appPublicUrl}/?nopol=${servis.nomor_polisi}`
    const waktuSelesai = formatTanggalWaktuWITA(servis.tanggal_selesai || new Date().toISOString())
    const namaMekanik = (servis.mekanik as { nama?: string } | null)?.nama ?? null

    const pesan = susunTemplatePesan({
      nama_pembawa: servis.nama_pembawa,
      nomor_polisi: servis.nomor_polisi,
      jenis_motor: servis.jenis_motor,
      masalah: servis.masalah,
      nama_mekanik: namaMekanik,
      tanggal_selesai: waktuSelesai,
      url_monitoring: urlMonitoring,
    })

    // Validasi format nomor telepon
    if (!isValidNomorWa(nomorTujuan)) {
      const keteranganGalat = `Nomor WhatsApp tidak valid: "${servis.nomor_wa}" (harus 10-15 digit, diawali 62)`
      await dbClient.from('riwayat_notifikasi').insert({
        layanan_service_id,
        nomor_tujuan: nomorTujuan || servis.nomor_wa,
        pesan,
        status: 'gagal',
        respons_gateway: keteranganGalat,
      })

      return new Response(
        JSON.stringify({ success: false, status: 'gagal', error: keteranganGalat }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Ambil konfigurasi kredensial WapiSender
    const apiKey = Deno.env.get('WAPISENDER_API_KEY')
    const deviceKey = Deno.env.get('WAPISENDER_DEVICE_KEY')

    if (!apiKey || !deviceKey) {
      const keteranganGalat = 'Kredensial WAPISENDER_API_KEY atau WAPISENDER_DEVICE_KEY belum dikonfigurasi di environment secrets'
      await dbClient.from('riwayat_notifikasi').insert({
        layanan_service_id,
        nomor_tujuan: nomorTujuan,
        pesan,
        status: 'gagal',
        respons_gateway: keteranganGalat,
      })

      return new Response(
        JSON.stringify({ success: false, status: 'gagal', error: keteranganGalat }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Panggil API WapiSender dengan timeout 30 detik
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    let responsGatewayText = ''
    let isSuccess = false
    let idPesanGateway: string | null = null

    try {
      const res = await fetch('https://wapisender.id/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          device_key: deviceKey,
          to: nomorTujuan,
          message: pesan,
          is_priority: true,
          simulate_typing: false,
        }),
        signal: controller.signal,
      })

      responsGatewayText = await res.text()
      clearTimeout(timeoutId)

      let resJson: Record<string, unknown> | null = null
      try {
        resJson = JSON.parse(responsGatewayText)
      } catch {
        resJson = null
      }

      if (res.ok) {
        if (
          resJson?.status === true ||
          resJson?.status === 'success' ||
          resJson?.success === true ||
          (resJson && !('status' in resJson) && !('error' in resJson))
        ) {
          isSuccess = true
          idPesanGateway = (
            (resJson?.data as Record<string, unknown>)?.id ||
            resJson?.id ||
            resJson?.message_id ||
            null
          ) as string | null
        } else {
          isSuccess = false
        }
      } else {
        isSuccess = false
      }
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const err = fetchErr as Error
      responsGatewayText = `Fetch error: ${
        err.name === 'AbortError'
          ? 'Koneksi timeout (30s) ke gateway WapiSender. Pastikan status device di dashboard wapisender.id berstatus Connected (Online).'
          : err.message
      }`
      isSuccess = false
    }

    // Simpan audit ke riwayat_notifikasi
    const { error: insertErr } = await dbClient.from('riwayat_notifikasi').insert({
      layanan_service_id,
      nomor_tujuan: nomorTujuan,
      pesan,
      status: isSuccess ? 'berhasil' : 'gagal',
      respons_gateway: responsGatewayText,
      id_pesan_gateway: idPesanGateway,
    })

    if (insertErr) {
      console.error('Gagal mencatat riwayat_notifikasi:', insertErr)
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        status: isSuccess ? 'berhasil' : 'gagal',
        nomor_tujuan: nomorTujuan,
        id_pesan_gateway: idPesanGateway,
        respons: responsGatewayText,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const error = err as Error
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
