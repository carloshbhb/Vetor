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
import AnalyticsTester from '@/components/AnalyticsTester';

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
        {/* Microsoft Clarity */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "x1twakbx6h");
            `,
          }}
        />
        {/* Google Analytics 4 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-9D57MBBJN7"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-9D57MBBJN7');
            `,
          }}
        />
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
        {/* GlitchTip Error Tracking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var dsn = 'https://3bee3ad895124a8bab41c0dd243aa1d1@app.glitchtip.com/24369';
                if (!dsn) return;
                
                window.Sentry = {
                  captureException: function(error, options) {
                    fetch(dsn, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        exception: {
                          values: [{
                            type: error.name || 'Error',
                            value: error.message || 'Unknown error',
                            stacktrace: {
                              frames: error.stack ? error.stack.split('\\n').slice(1, 6).map(function(line) {
                                var match = line.match(/at (.+):(\d+:\d+)/);
                                return {
                                  filename: match ? match[1] : 'unknown',
                                  lineno: match ? parseInt(match[2]) : 0,
                                  colno: match ? parseInt(match[3]) : 0,
                                };
                              }) : []
                            }
                          }]
                        },
                        timestamp: new Date().toISOString(),
                        platform: 'javascript',
                        url: window.location.href,
                        tags: {
                          mode: '${process.env.NODE_ENV || "production"}'
                        }
                      })
                    }).catch(function() {});
                  },
                  captureMessage: function(message, level) {
                    fetch(dsn, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        logentry: { message: message },
                        level: level || 'info',
                        timestamp: new Date().toISOString(),
                        platform: 'javascript',
                        url: window.location.href
                      })
                    }).catch(function() {});
                  },
                  withScope: function(callback) {
                    var scope = {
                      setExtra: function() {},
                      setTag: function() {},
                      setUser: function() {}
                    };
                    if (callback) callback(scope);
                  },
                  addBreadcrumb: function() {}
                };
              })();
            `,
          }}
        />
      </head>
      <body>
        <Analytics />
        <WebVitalsReporter />
        <AnalyticsDebugger />
        <AnalyticsTester />
        {children}
      </body>
    </html>
  );
}
