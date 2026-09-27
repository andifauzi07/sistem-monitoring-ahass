import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
	ambilDaftarMekanik,
	nonaktifkanMekanik,
	tambahMekanik,
	ubahNamaMekanik,
	ubahStatusHadir,
	type MekanikRingkasan,
} from '../lib/mekanik';
import type { PesanMekanik } from '../lib/mekanikErrors';
import { useMuat } from '../lib/useMuat';

const inputClass =
	'mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:bg-slate-100';

export function MekanikPage() {
	const loader = useCallback(() => ambilDaftarMekanik(), []);
	const { data, error, loading, muatUlang } = useMuat(loader);

	const [tambahOpen, setTambahOpen] = useState(false);
	const [namaBaru, setNamaBaru] = useState('');
	const [menambah, setMenambah] = useState(false);
	const [galatTambah, setGalatTambah] = useState<PesanMekanik | null>(null);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState('');
	const [galatBaris, setGalatBaris] = useState<Record<string, string>>({});
	const [processingId, setProcessingId] = useState<string | null>(null);
	const [konfirmasiId, setKonfirmasiId] = useState<string | null>(null);

	function tutupDialogTambah() {
		setTambahOpen(false);
		setNamaBaru('');
		setGalatTambah(null);
	}

	async function handleTambah() {
		if (menambah) return;
		setMenambah(true);
		setGalatTambah(null);
		const hasil = await tambahMekanik(namaBaru);
		setMenambah(false);
		if (hasil.error) {
			setGalatTambah(hasil.error);
			return;
		}
		setNamaBaru('');
		setTambahOpen(false);
		muatUlang();
	}

	function mulaiEdit(m: MekanikRingkasan) {
		setEditingId(m.id);
		setEditValue(m.nama);
		setGalatBaris((g) => ({ ...g, [m.id]: '' }));
	}

	async function simpanEdit(id: string) {
		setProcessingId(id);
		const hasil = await ubahNamaMekanik(id, editValue);
		setProcessingId(null);
		if (hasil.error) {
			setGalatBaris((g) => ({ ...g, [id]: hasil.error.pesan }));
			return;
		}
		setEditingId(null);
		muatUlang();
	}

	async function toggleHadir(m: MekanikRingkasan) {
		setProcessingId(m.id);
		const hasil = await ubahStatusHadir(m.id, !m.status_hadir);
		setProcessingId(null);
		if (hasil.error) {
			setGalatBaris((g) => ({ ...g, [m.id]: hasil.error.pesan }));
			return;
		}
		muatUlang();
	}

	async function konfirmasiNonaktifkan() {
		if (!konfirmasiId) return;
		const id = konfirmasiId;
		setProcessingId(id);
		const hasil = await nonaktifkanMekanik(id);
		setProcessingId(null);
		setKonfirmasiId(null);
		if (hasil.error) {
			setGalatBaris((g) => ({ ...g, [id]: hasil.error.pesan }));
			return;
		}
		muatUlang();
	}

	const mekanikDikonfirmasi = data?.find((m) => m.id === konfirmasiId) ?? null;

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold text-slate-900">Manajemen Mekanik</h1>

			{loading && <p className="py-10 text-center text-slate-500">Memuat…</p>}

			{error && (
				<div
					role="alert"
					className="rounded-md bg-red-50 p-4 text-sm text-red-700">
					{error.pesan}{' '}
					<button
						type="button"
						onClick={muatUlang}
						className="font-semibold underline">
						Coba lagi
					</button>
				</div>
			)}

			{data && data.length === 0 && (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
					<p className="text-slate-600">Belum ada mekanik aktif.</p>
				</div>
			)}

			{data && data.length > 0 && (
				<ul className="space-y-3">
					{data.map((m) => {
						const sedangDiproses = processingId === m.id;
						return (
							<li
								key={m.id}
								className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div className="min-w-0 flex-1">
										{editingId === m.id ? (
											<div className="flex flex-wrap items-center gap-2">
												<input
													value={editValue}
													onChange={(e) => setEditValue(e.target.value)}
													disabled={sedangDiproses}
													autoFocus
													className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
												/>
												<button
													type="button"
													onClick={() => void simpanEdit(m.id)}
													disabled={sedangDiproses}
													className="min-h-11 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
													Simpan
												</button>
												<button
													type="button"
													onClick={() => setEditingId(null)}
													disabled={sedangDiproses}
													className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
													Batal
												</button>
											</div>
										) : (
											<p className="text-lg font-semibold text-slate-900">{m.nama}</p>
										)}
										<p className="text-sm text-slate-500">
											Menangani {m.bebanKerja} kendaraan saat ini
										</p>
										{galatBaris[m.id] && (
											<p
												role="alert"
												className="mt-1 text-sm text-red-600">
												{galatBaris[m.id]}
											</p>
										)}
									</div>

									<div className="flex flex-wrap items-center gap-2">
										<button
											type="button"
											onClick={() => void toggleHadir(m)}
											disabled={sedangDiproses}
											aria-pressed={m.status_hadir}
											className={`min-h-11 rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors disabled:opacity-60 ${
												m.status_hadir
													? 'bg-green-50 text-green-700 ring-green-300 hover:bg-green-100'
													: 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
											}`}>
											{m.status_hadir ? 'Hadir' : 'Tidak Hadir'}
										</button>
										{editingId !== m.id && (
											<button
												type="button"
												onClick={() => mulaiEdit(m)}
												disabled={sedangDiproses}
												className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
												Edit
											</button>
										)}
										<button
											type="button"
											onClick={() => setKonfirmasiId(m.id)}
											disabled={sedangDiproses}
											className="min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
											Nonaktifkan
										</button>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<ConfirmDialog
				open={konfirmasiId !== null}
				judul="Nonaktifkan mekanik?"
				labelKonfirmasi="Nonaktifkan"
				bahaya
				memproses={konfirmasiId !== null && processingId === konfirmasiId}
				onKonfirmasi={() => void konfirmasiNonaktifkan()}
				onBatal={() => setKonfirmasiId(null)}>
				{mekanikDikonfirmasi && (
					<p>
						{mekanikDikonfirmasi.nama} tidak akan muncul lagi di daftar mekanik aktif. Riwayat
						penugasan sebelumnya tetap tersimpan.
					</p>
				)}
			</ConfirmDialog>

			<button
				type="button"
				onClick={() => setTambahOpen(true)}
				aria-label="Tambah mekanik"
				className="fixed bottom-6 right-6 z-10 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2">
				<Plus className="size-7" aria-hidden="true" />
			</button>

			<ConfirmDialog
				open={tambahOpen}
				judul="Tambah Mekanik"
				labelKonfirmasi="Simpan"
				memproses={menambah}
				onKonfirmasi={() => void handleTambah()}
				onBatal={tutupDialogTambah}>
				<div className="text-left">
					<label
						htmlFor="nama-mekanik-baru"
						className="block text-sm font-medium text-slate-700">
						Nama mekanik
					</label>
					<input
						id="nama-mekanik-baru"
						value={namaBaru}
						onChange={(e) => setNamaBaru(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								void handleTambah();
							}
						}}
						disabled={menambah}
						autoFocus
						placeholder="Nama mekanik"
						autoComplete="off"
						className={inputClass}
					/>
					{galatTambah && (
						<p
							role="alert"
							className="mt-1 text-sm text-red-600">
							{galatTambah.pesan}
						</p>
					)}
				</div>
			</ConfirmDialog>
		</div>
	);
}
