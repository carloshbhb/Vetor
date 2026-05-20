'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Settings,
  ExternalLink,
  Zap,
} from 'lucide-react';
import Logo from '@/components/Logo';

const NAV_ITEMS = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/novo-review',   label: 'Novo Review',    icon: PlusCircle },
  { href: '/admin/reviews',       label: 'Todos os Reviews', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
      style={{ width: 'var(--sidebar-width)', background: '#0f1f8a' }}
    >
      {/* Branding */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <Logo inverse={true} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        <p className="text-white/30 text-[10px] font-bold tracking-[0.14em] uppercase px-3 py-2">
          Conteúdo
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive(href)
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Icon size={17} className={isActive(href) ? 'opacity-100' : 'opacity-60'} />
            {label}
          </Link>
        ))}

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/30 text-[10px] font-bold tracking-[0.14em] uppercase px-3 py-2">
            Site
          </p>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <ExternalLink size={17} className="opacity-60" />
            Ver Site
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#4ade80]" />
          <span className="text-white/50 text-[11px] font-medium">Gemini API</span>
        </div>
        <p className="text-white/25 text-[10px] leading-relaxed">
          vetor.blog &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
