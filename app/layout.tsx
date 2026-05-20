import type { Metadata } from 'next';
import { Bebas_Neue, Syne, DM_Sans } from 'next/font/google';
import './globals.css';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const syne = Syne({
  weight: ['700', '800'],
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const dm = DM_Sans({
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Vetor Blog | Reviews Sinceros de Produtos', template: '%s | Vetor Blog' },
  description: 'Descubra os melhores produtos do mercado com nossas análises detalhadas, prós, contras e notas rigorosas.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${syne.variable} ${dm.variable}`}>
      <body>{children}</body>
    </html>
  );
}
