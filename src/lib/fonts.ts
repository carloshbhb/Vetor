import { Fraunces, Inter } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});