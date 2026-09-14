import type { Metadata, Viewport } from "next";
import { OrganizationSchema, WebSiteSchema } from "@/components/SchemaMarkup";
import { fraunces, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vetor.blog — Reviews e Comparativos",
    template: "%s | vetor.blog",
  },
  description:
    "Reviews profissionais, comparativos e recomendações de compra. Escolha com confiança.",
  metadataBase: new URL("https://vetor.blog"),
  openGraph: {
    title: "vetor.blog",
    description: "Reviews e comparativos modernos.",
    siteName: "vetor.blog",
    locale: "pt_BR",
    type: "website",
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
  themeColor: "#080C14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
