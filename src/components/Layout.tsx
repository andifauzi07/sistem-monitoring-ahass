import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../lib/authContext';
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
// import { ConnectionStatus } from './ConnectionStatus';

const navClass = ({ isActive }: { isActive: boolean }) =>
	`inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium transition-colors sm:px-3 ${
		isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
	}`;

export function Layout() {
	const { status, signOut } = useAuth();
	const navigate = useNavigate();

	async function handleSignOut() {
		await signOut();
		navigate('/login', { replace: true });
	}

	return (
		<div className="flex min-h-dvh flex-col">
			<header className="bg-brand-600 text-white shadow-sm">
				<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
					<Link
						to="/"
						className="flex min-w-0 items-center gap-2">
						<img
							src="/favicon.svg"
							alt=""
							className="size-8 rounded-md ring-1 ring-white/30"
						/>
						<span className="min-w-0 leading-tight">
							<span className="block truncate text-sm font-bold sm:text-base">AHASS Mamuju</span>
							<span className="block truncate text-xs text-white/75">Monitoring Servis</span>
						</span>
					</Link>
					<nav className="flex shrink-0 items-center gap-1">
						<NavLink
							to="/"
							end
							className={navClass}>
							Cek Status
						</NavLink>
						{status === 'guest' && (
							<NavLink
								to="/login"
								className={navClass}>
								Masuk
							</NavLink>
						)}
						{status === 'authenticated' && (
							<>
								<NavLink
									to="/dashboard"
									className={navClass}>
									Dashboard
								</NavLink>
								<NavLink
										to="/servis"
									className={navClass}>
									Servis
								</NavLink>
								<NavLink
									to="/riwayat"
									className={navClass}>
									Riwayat
								</NavLink>
								<NavLink
									to="/mekanik"
									className={navClass}>
									Mekanik
								</NavLink>
								<NavLink
									to="/akun"
									className={navClass}>
									Akun
								</NavLink>
								<button
									type="button"
									onClick={handleSignOut}
									className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-3">
									Keluar
								</button>
							</>
						)}
					</nav>
				</div>
			</header>

			{!isSupabaseConfigured && (
				<div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
					{supabaseConfigError}
				</div>
			)}

			<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
				<Outlet />
			</main>

			<footer className="border-t border-slate-200 bg-white">
				<div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
					<span>© {new Date().getFullYear()} AHASS Kota Mamuju</span>
					{/* <ConnectionStatus /> */}
				</div>
			</footer>
		</div>
	);
}
