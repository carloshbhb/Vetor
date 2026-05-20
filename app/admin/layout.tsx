import Sidebar from '@/components/admin/Sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vetor Blog CMS',
  description: 'Painel de administração — Vetor Blog',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg2">
      <Sidebar />
      <main className="flex-1 flex flex-col" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {children}
      </main>
    </div>
  );
}
