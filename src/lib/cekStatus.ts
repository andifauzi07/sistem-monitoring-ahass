import { supabase } from './supabase';
import { isAktif } from './statusServis';
import { MSG_JARINGAN, MSG_UMUM } from './servisErrors';
import type { HasilCekStatus } from '../types/database';

export type PesanCekStatus = {
	kode: 'JARINGAN' | 'UMUM';
	pesan: string;
};

export type Hasil<T> = { data: T; error: null } | { data: null; error: PesanCekStatus };

/** Panjang minimal nopol ternormalisasi, sama dengan aturan di `cek_status`. */
export const PANJANG_MIN_NOPOL = 3;

/** Batas riwayat kunjungan yang ditampilkan ke pelanggan (design D5). */
const MAKS_RIWAYAT = 5;

function petakanError(message: string): PesanCekStatus {
	return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
		? { kode: 'JARINGAN', pesan: MSG_JARINGAN }
		: { kode: 'UMUM', pesan: MSG_UMUM };
}

export async function cekStatus(nopol: string): Promise<Hasil<HasilCekStatus[]>> {
	try {
		const { data, error } = await supabase.rpc('cek_status', { nopol });
		if (error) return { data: null, error: petakanError(error.message ?? '') };
		return { data: data ?? [], error: null };
	} catch (err) {
		// Jaga-jaga bila client melempar alih-alih mengembalikan `error`.
		return { data: null, error: petakanError(err instanceof Error ? err.message : String(err)) };
	}
}

/**
 * Memisahkan hasil `cek_status` (sudah terurut terbaru) menjadi servis aktif
 * (paling banyak satu, sesuai constraint DB) dan riwayat kunjungan (maks. 5).
 */
export function pisahkanHasil(hasil: HasilCekStatus[]): {
	aktif: HasilCekStatus | null;
	riwayat: HasilCekStatus[];
} {
	return {
		aktif: hasil.find((h) => isAktif(h.status)) ?? null,
		riwayat: hasil.filter((h) => !isAktif(h.status)).slice(0, MAKS_RIWAYAT),
	};
}
