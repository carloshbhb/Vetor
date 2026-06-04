import type { Metadata } from 'next';
import { Bebas_Neue, Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/article.css';
import '@/styles/score.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/sidebar.css';
import { PerformanceHead } from '@/components/PerformanceHead';
import Analytics from '@/components/Analytics';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import AnalyticsDebugger from '@/components/AnalyticsDebugger';

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

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const SITE_URL = RAW_SITE_URL.startsWith('http') ? RAW_SITE_URL : `https://${RAW_SITE_URL}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Vetor Blog | Reviews Sinceros de Produtos', template: '%s | Vetor Blog' },
  description: 'Descubra os melhores produtos do mercado com nossas análises detalhadas, prós, contras e notas rigorosas.',
  robots: { index: true, follow: true },
  alternates: {
    languages: {
      'pt-BR': '/',
    },
  },
  verification: {
    google: 'M3d89AYWh1qAFUV3Od0Za5Es5Ymp-4a5pyCeBvxxEOM',
  },
  manifest: '/manifest.json',
  themeColor: '#2563eb',
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vetor Blog',
  url: SITE_URL,
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

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vetor Blog',
  url: SITE_URL,
  description: 'Reviews sinceros e análises detalhadas de produtos para compradores inteligentes.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/review/{search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${syne.variable} ${dm.variable}`}>
      <head>
        <PerformanceHead />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW registered:', reg.scope))
                    .catch(err => console.error('SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <Analytics />
        <WebVitalsReporter />
        <AnalyticsDebugger />
        {children}
      </body>
    </html>
  );
}
