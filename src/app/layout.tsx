import type { Metadata, Viewport } from "next";
import { OrganizationSchema, WebSiteSchema } from "@/components/SchemaMarkup";
import { bebasNeue, syne, dmSans } from "@/lib/fonts";
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
          rel="alternate"
          type="application/rss+xml"
          title="vetor.blog — Reviews e Comparativos"
          href="https://www.vetor.blog/feed.xml"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}