import type { Metadata } from "next";
import { Nunito_Sans, Quicksand } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-body" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Malabrigo Club Resort",
  description: "Plataforma de gestión para socios de Malabrigo Club Resort",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const savedPortalView = (await cookies()).get("malabrigo_portal_view")?.value;
  const portalViewPreference: "AMBASSADOR" | "INVESTOR" | null = savedPortalView === "AMBASSADOR" || savedPortalView === "INVESTOR" ? savedPortalView : null;
  const shellUser = user ? {
    displayName: user.displayName,
    roles: user.roles.map((entry) => entry.role.code),
    permissions: user.permissions.map((entry) => entry.permission.code),
    hasAmbassadorProfile: Boolean(user.member?.ambassadorProfile),
    hasInvestorProfile: Boolean(user.member?.investorProfile),
    portalViewPreference,
  } : null;
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${nunitoSans.variable} ${quicksand.variable}`}><AppShell user={shellUser}>{children}</AppShell></body>
    </html>
  );
}
