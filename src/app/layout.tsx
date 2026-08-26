import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Malabrigo Club Resort",
  description: "Plataforma de gestión para socios de Malabrigo Club Resort",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${manrope.variable}`}><AppShell>{children}</AppShell></body>
    </html>
  );
}
