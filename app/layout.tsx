import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planetens Svar – Prototype 0.1",
  description: "En turbaseret kontrolpult for en koloni på en fjern planet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="da"><body>{children}</body></html>;
}
