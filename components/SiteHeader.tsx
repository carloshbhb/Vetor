import Link from 'next/link';
import Logo from '@/components/Logo';

export default function SiteHeader() {
  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-text-muted">
          <Link href="/" className="hover:text-text transition-colors">Reviews</Link>
          <Link href="/research" className="hover:text-text transition-colors hidden sm:inline">Pesquisa</Link>
          <Link href="/sobre" className="hover:text-text transition-colors hidden sm:inline">Sobre</Link>
        </nav>
      </div>
    </header>
  );
}
