import type { Metadata } from 'next';
import { Bebas_Neue, Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { PerformanceHead } from '@/components/PerformanceHead';

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vetor Blog',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'Reviews sinceros e análises detalhadas de produtos para compradores inteligentes.',
  sameAs: [
    'https://www.youtube.com/@vetorblog',
    'https://www.linkedin.com/company/vetorblog',
    'https://www.instagram.com/vetorblog',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Portuguese',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${syne.variable} ${dm.variable}`}>
      <head>
        <PerformanceHead />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
