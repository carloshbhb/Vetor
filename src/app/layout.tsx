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
  themeColor: "#07090F",
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
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}