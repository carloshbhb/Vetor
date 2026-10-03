import type { Metadata, Viewport } from "next";
import { OrganizationSchema, WebSiteSchema } from "@/components/SchemaMarkup";
import HoverFX from "@/components/HoverFX";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AffiliateTracker from "@/components/AffiliateTracker";
import Ga4 from "@/components/Ga4";
import CookieBanner from "@/components/CookieBanner";
import { inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vetor.blog — Reviews, Comparativos e Melhores Produtos",
    template: "%s | vetor.blog",
  },
  description:
    "Reviews independentes, comparativos e guias de compra em português. Notas de 0 a 10, prós e contras e as melhores ofertas para você escolher com confiança.",
  metadataBase: new URL("https://www.vetor.blog"),
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "https://www.vetor.blog",
      "x-default": "https://www.vetor.blog",
    },
  },
  openGraph: {
    title: "vetor.blog",
    description: "Reviews e comparativos modernos.",
    siteName: "vetor.blog",
    locale: "pt_BR",
    type: "website",
    url: "https://www.vetor.blog",
    images: [
      {
        url: "https://www.vetor.blog/og.png",
        width: 1200,
        height: 630,
        alt: "vetor.blog — Reviews honestas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://www.vetor.blog/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071018",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <meta name="google-site-verification" content="M3d89AYWh1qAFUV3Od0Za5Es5Ymp-4a5pyCeBvxxEOM" />
        <OrganizationSchema />
        <WebSiteSchema />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="vetor.blog — Reviews e Comparativos"
          href="https://www.vetor.blog/feed.xml"
        />
      </head>
      <body className="antialiased">
        <HoverFX />
        <Ga4 />
        <AffiliateTracker />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}