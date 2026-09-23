import type { Metadata, Viewport } from "next";
import { OrganizationSchema, WebSiteSchema } from "@/components/SchemaMarkup";
import { bebasNeue, syne, dmSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vetor.blog — Reviews e Comparativos",
    template: "%s | vetor.blog",
  },
  description:
    "Reviews profissionais, comparativos e recomendações de compra. Escolha com confiança.",
  metadataBase: new URL("https://www.vetor.blog"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "vetor.blog",
    description: "Reviews e comparativos modernos.",
    siteName: "vetor.blog",
    locale: "pt_BR",
    type: "website",
    url: "https://www.vetor.blog",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${syne.variable} ${dmSans.variable}`}>
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/_next/static/media/6c25f6e897d845a3-s.p.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/_next/static/media/8a1d8947e5852e30-s.p.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/_next/static/media/13971731025ec697-s.p.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}