"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell, ChevronDown, FileCheck2, FolderKanban, Gauge,
  HardHat, KeyRound, Landmark, Menu, Search, Settings, UserRound, UsersRound, Files,
  WalletCards, X, Network,
  LogOut, ShieldCheck,
} from "lucide-react";
import { logoutAction } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";

type NavigationItem = { label: string; icon: LucideIcon; href: string; permission: string };
const navigation: NavigationItem[] = [
  { label: "Resumen", icon: Gauge, href: "/", permission: "DASHBOARD" },
  { label: "Socios", icon: UsersRound, href: "/socios", permission: "MEMBERS" },
  { label: "Embajadores", icon: Network, href: "/embajadores", permission: "AMBASSADORS" },
  { label: "Ventas", icon: Landmark, href: "/ventas", permission: "SALES" },
  { label: "Pagos", icon: WalletCards, href: "/pagos", permission: "PAYMENTS" },
  { label: "Contratos", icon: FileCheck2, href: "/contratos", permission: "CONTRACTS" },
  { label: "Documentos", icon: Files, href: "/documentos", permission: "CONTRACTS" },
  { label: "Proyectos", icon: FolderKanban, href: "/proyectos", permission: "CONSTRUCTION" },
  { label: "Avance de obra", icon: HardHat, href: "/avance-obra", permission: "CONSTRUCTION" },
  { label: "Reportes", icon: FolderKanban, href: "/reportes", permission: "REPORTS" },
];

const investorNavigation: NavigationItem[] = [
  { label: "Mis inversiones", icon: Landmark, href: "/mi-portal", permission: "PORTAL" },
  { label: "Mis pagos", icon: WalletCards, href: "/mi-portal/pagos", permission: "PORTAL" },
  { label: "Mis contratos", icon: FileCheck2, href: "/mi-portal/contratos", permission: "PORTAL" },
  { label: "Mis documentos", icon: Files, href: "/mi-portal/documentos", permission: "PORTAL" },
  { label: "Avance de obra", icon: HardHat, href: "/mi-portal/avance-obra", permission: "PORTAL" },
  { label: "Mis reportes", icon: FolderKanban, href: "/mi-portal/reportes", permission: "PORTAL" },
];

type PortalView = "AMBASSADOR" | "INVESTOR";
type ShellUser = { displayName: string; roles: string[]; permissions: string[]; hasAmbassadorProfile: boolean; hasInvestorProfile: boolean; portalViewPreference: PortalView | null } | null;

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedPortalView, setSelectedPortalView] = useState<PortalView>(pathname.startsWith("/mi-portal") ? "INVESTOR" : pathname.startsWith("/mi-red") ? "AMBASSADOR" : user?.portalViewPreference ?? "AMBASSADOR");
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", closeMenus);
    return () => window.removeEventListener("keydown", closeMenus);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const closeWhenOutside = (event: PointerEvent | FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !profileMenuRef.current?.contains(target)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
    };
  }, [profileOpen]);

  const publicPaths = ["/activar-cuenta", "/iniciar-sesion", "/recuperar-contrasena", "/restablecer-contrasena"];
  if (publicPaths.some((path) => pathname.startsWith(path))) return <>{children}</>;
  const superadmin = user?.roles.includes("SUPERADMIN") ?? false;
  const visibleNavigation = navigation.filter((item) => superadmin || user?.permissions.includes(item.permission));
  const hasAmbassadorProfile = user?.hasAmbassadorProfile ?? false;
  const hasInvestorProfile = user?.hasInvestorProfile ?? false;
  const hasDualProfile = hasAmbassadorProfile && hasInvestorProfile;
  const routePortalView: PortalView | null = pathname.startsWith("/mi-red") ? "AMBASSADOR" : pathname.startsWith("/mi-portal") ? "INVESTOR" : null;
  const activePortalView = routePortalView
    ?? (hasAmbassadorProfile && !hasInvestorProfile ? "AMBASSADOR" : hasInvestorProfile && !hasAmbassadorProfile ? "INVESTOR" : selectedPortalView);
  const portalNavigation = activePortalView === "AMBASSADOR"
    ? (hasAmbassadorProfile ? [{ label: "Mi red", icon: Network, href: "/mi-red", permission: "PORTAL" }] : [])
    : (hasInvestorProfile ? investorNavigation : []);
  const initials = user?.displayName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "?";
  const profileLabel = superadmin ? "Superadministrador" : activePortalView === "AMBASSADOR" && hasAmbassadorProfile ? "Vista Embajador" : hasInvestorProfile ? "Vista Inversionista" : "Administración";
  const canManageUsers = superadmin || (user?.permissions.includes("ADMIN_USERS") ?? false);
  const canOpenSettings = superadmin || (user?.permissions.includes("SETTINGS") ?? false);
  const selectPortalView = (view: PortalView) => {
    setSelectedPortalView(view);
    document.cookie = `malabrigo_portal_view=${view}; path=/; max-age=31536000; samesite=lax`;
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
      {menuOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <BrandLogo compact />
          <button className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        {hasDualProfile && (
          <div className="portal-switcher" aria-label="Seleccionar perfil de navegación">
            <span>Ver como</span>
            <div>
              <Link href="/mi-red" aria-current={activePortalView === "AMBASSADOR" ? "page" : undefined} className={activePortalView === "AMBASSADOR" ? "active" : ""} onClick={() => selectPortalView("AMBASSADOR")}><Network aria-hidden="true" size={17} />Embajador</Link>
              <Link href="/mi-portal" aria-current={activePortalView === "INVESTOR" ? "page" : undefined} className={activePortalView === "INVESTOR" ? "active" : ""} onClick={() => selectPortalView("INVESTOR")}><Landmark aria-hidden="true" size={17} />Inversionista</Link>
            </div>
          </div>
        )}

        <nav className="nav-list" aria-label="Navegación principal">
          {!!visibleNavigation.length && <div className="nav-group"><span className="nav-group-label">Operación</span>{visibleNavigation.map(({ label, icon: Icon, href }) => {
              const active = href === "/" || href === "/mi-portal" ? pathname === href : pathname.startsWith(href);
              return <Link className={active ? "nav-item active" : "nav-item"} href={href} key={href} onClick={() => { setMenuOpen(false); setProfileOpen(false); }} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" size={19} strokeWidth={1.8} /><span>{label}</span></Link>;
            })}</div>}
          {!!portalNavigation.length && <div className="nav-group"><span className="nav-group-label">{activePortalView === "AMBASSADOR" ? "Portal del embajador" : "Portal del inversionista"}</span>{portalNavigation.map(({ label, icon: Icon, href }) => {
            const active = href === "/mi-portal" ? pathname === href : pathname.startsWith(href);
            return <Link className={active ? "nav-item active" : "nav-item"} href={href} key={href} onClick={() => { setMenuOpen(false); setProfileOpen(false); }} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" size={19} strokeWidth={1.8} /><span>{label}</span></Link>;
          })}</div>}
        </nav>

        {canManageUsers && <div className="sidebar-footer"><Link className={pathname.startsWith("/administracion") ? "nav-item active" : "nav-item"} href="/administracion/usuarios" onClick={() => { setMenuOpen(false); setProfileOpen(false); }}><ShieldCheck size={18} />Administración</Link></div>}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <label className="search-box"><Search aria-hidden="true" size={17} /><input aria-label="Buscar" placeholder="Buscar socio, venta o comprobante..." /></label>
          <div className="topbar-actions">
            <button className="icon-button notification" aria-label="Notificaciones"><Bell aria-hidden="true" size={19} /><i aria-hidden="true" /></button>
            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button className="profile" type="button" aria-expanded={profileOpen} aria-controls="profile-actions" onClick={() => setProfileOpen((open) => !open)}>
                <div className="avatar">{initials}</div><div><strong>{user?.displayName ?? "Sin sesión"}</strong><span>{profileLabel}</span></div><ChevronDown className={profileOpen ? "profile-chevron open" : "profile-chevron"} size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu" id="profile-actions">
                  <Link href="/mi-cuenta" onClick={() => setProfileOpen(false)}><UserRound size={17} />Mi cuenta</Link>
                  <Link href="/mi-cuenta/seguridad" onClick={() => setProfileOpen(false)}><KeyRound size={17} />Cambiar contraseña</Link>
                  {canOpenSettings && <Link href="/configuracion" onClick={() => setProfileOpen(false)}><Settings size={17} />Configuración</Link>}
                  <form action={logoutAction}><button type="submit"><LogOut size={17} />Cerrar sesión</button></form>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content" id="contenido-principal" tabIndex={-1}>{children}</main>
      </section>
    </div>
  );
}
