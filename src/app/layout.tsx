import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Quicksand } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { PwaRegistration } from "@/components/pwa-registration";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-body" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Malabrigo Club Resort",
  description: "Plataforma de gestión para socios de Malabrigo Club Resort",
  applicationName: "Malabrigo Club Resort",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Malabrigo",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#031522",
  colorScheme: "dark",
  viewportFit: "cover",
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
      <body className={`${nunitoSans.variable} ${quicksand.variable}`}>
        <PwaRegistration />
        <AppShell user={shellUser}>{children}</AppShell>
      </body>
    </html>
  );
}
