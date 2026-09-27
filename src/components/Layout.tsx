import {
	History,
	LayoutDashboard,
	LogIn,
	LogOut,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Search,
	UserCircle,
	Users,
	Wrench,
	X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../lib/authContext';
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';

type NavItem = {
	to: string;
	label: string;
	icon: typeof Search;
	end?: boolean;
};

const CEK_STATUS_ITEM: NavItem = { to: '/', label: 'Cek Status', icon: Search, end: true };
const MASUK_ITEM: NavItem = { to: '/login', label: 'Masuk', icon: LogIn };

const SA_ITEMS: NavItem[] = [
	CEK_STATUS_ITEM,
	{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ to: '/servis', label: 'Servis', icon: Wrench },
	{ to: '/riwayat', label: 'Riwayat', icon: History },
	{ to: '/mekanik', label: 'Mekanik', icon: Users },
	{ to: '/akun', label: 'Akun', icon: UserCircle },
];

function sidebarLinkClass(collapsed: boolean) {
	return ({ isActive }: { isActive: boolean }) =>
		`flex min-h-11 items-center rounded-md text-sm font-medium transition-colors ${
			collapsed ? 'justify-center px-0' : 'gap-3 px-3'
		} ${isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`;
}

const mobilePanelLinkClass = ({ isActive }: { isActive: boolean }) =>
	`flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium transition-colors ${
		isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
	}`;

const mobileInlineLinkClass = ({ isActive }: { isActive: boolean }) =>
	`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors ${
		isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
	}`;

function BrandMark() {
	return (
		<Link
			to="/"
			className="flex min-w-0 items-center gap-2">
			<img
				src="/favicon.svg"
				alt=""
				className="size-8 shrink-0 rounded-md ring-1 ring-white/30"
			/>
			<span className="min-w-0 leading-tight">
				<span className="block truncate text-sm font-bold sm:text-base">AHASS Mamuju</span>
				<span className="block truncate text-xs text-white/75">Monitoring Servis</span>
			</span>
		</Link>
	);
}

export function Layout() {
	const { status, signOut } = useAuth();
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	async function handleSignOut() {
		setMenuOpen(false);
		await signOut();
		navigate('/login', { replace: true });
	}

	const isAuthenticated = status === 'authenticated';
	const items: NavItem[] = isAuthenticated
		? SA_ITEMS
		: status === 'guest'
			? [CEK_STATUS_ITEM, MASUK_ITEM]
			: [CEK_STATUS_ITEM];

	return (
		<div className="flex min-h-dvh flex-col">
			<div className={`flex flex-1 flex-col ${isAuthenticated ? 'sm:flex-row' : ''}`}>
				{isAuthenticated && (
					<aside
						className={`hidden shrink-0 bg-brand-600 text-white transition-[width] duration-150 sm:sticky sm:top-0 sm:flex sm:h-dvh sm:flex-col sm:self-start ${
							sidebarCollapsed ? 'sm:w-16' : 'sm:w-56'
						}`}>
						<div className={`flex items-center px-3 py-4 ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
							{!sidebarCollapsed && <BrandMark />}
							<button
								type="button"
								onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
								aria-label={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
								className="flex size-9 shrink-0 items-center justify-center rounded-md text-white/90 hover:bg-white/10">
								{sidebarCollapsed ? (
									<PanelLeftOpen
										className="size-5"
										aria-hidden="true"
									/>
								) : (
									<PanelLeftClose
										className="size-5"
										aria-hidden="true"
									/>
								)}
							</button>
						</div>
						<nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
							{items.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									end={item.end}
									title={sidebarCollapsed ? item.label : undefined}
									className={sidebarLinkClass(sidebarCollapsed)}>
									<item.icon
										className="size-5 shrink-0"
										aria-hidden="true"
									/>
									{!sidebarCollapsed && item.label}
								</NavLink>
							))}
							<button
								type="button"
								onClick={() => void handleSignOut()}
								title={sidebarCollapsed ? 'Keluar' : undefined}
								className={`mt-auto flex min-h-11 items-center rounded-md text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white ${
									sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
								}`}>
								<LogOut
									className="size-5 shrink-0"
									aria-hidden="true"
								/>
								{!sidebarCollapsed && 'Keluar'}
							</button>
						</nav>
					</aside>
				)}

				<header className={`relative z-20 bg-brand-600 text-white shadow-sm ${isAuthenticated ? 'sm:hidden' : ''}`}>
					<div className="flex items-center justify-between gap-4 px-4 py-3">
						<BrandMark />
						{isAuthenticated ? (
							<button
								type="button"
								onClick={() => setMenuOpen((open) => !open)}
								aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
								aria-expanded={menuOpen}
								className="flex size-11 shrink-0 items-center justify-center rounded-md text-white/90 hover:bg-white/10">
								{menuOpen ? (
									<X
										className="size-6"
										aria-hidden="true"
									/>
								) : (
									<Menu
										className="size-6"
										aria-hidden="true"
									/>
								)}
							</button>
						) : (
							<nav className="flex shrink-0 items-center gap-1">
								{items.map((item) => (
									<NavLink
										key={item.to}
										to={item.to}
										end={item.end}
										className={mobileInlineLinkClass}>
										{item.label}
									</NavLink>
								))}
							</nav>
						)}
					</div>

					{isAuthenticated && menuOpen && (
						<nav className="space-y-1 border-t border-white/10 px-3 py-3">
							{items.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									end={item.end}
									onClick={() => setMenuOpen(false)}
									className={mobilePanelLinkClass}>
									<item.icon
										className="size-5 shrink-0"
										aria-hidden="true"
									/>
									{item.label}
								</NavLink>
							))}
							<button
								type="button"
								onClick={() => void handleSignOut()}
								className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
								<LogOut
									className="size-5 shrink-0"
									aria-hidden="true"
								/>
								Keluar
							</button>
						</nav>
					)}
				</header>

				<div className="flex min-w-0 flex-1 flex-col">
					{!isSupabaseConfigured && (
						<div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
							{supabaseConfigError}
						</div>
					)}

					<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
						<Outlet />
					</main>
				</div>
			</div>

			{!isAuthenticated && (
				<footer className="border-t border-slate-200 bg-white">
					<div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
						<span>© {new Date().getFullYear()} AHASS Kota Mamuju</span>
					</div>
				</footer>
			)}
		</div>
	);
}
