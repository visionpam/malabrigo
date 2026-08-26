"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Building2, ChevronDown, FileCheck2, FolderKanban, Gauge,
  HardHat, Landmark, Menu, Search, Settings, UsersRound,
  WalletCards, X,
} from "lucide-react";

const navigation = [
  { label: "Resumen", icon: Gauge, href: "/" },
  { label: "Socios", icon: UsersRound, href: "/socios" },
  { label: "Ventas", icon: Landmark, href: "/ventas" },
  { label: "Pagos", icon: WalletCards, href: "/pagos" },
  { label: "Contratos", icon: FileCheck2, href: "/contratos" },
  { label: "Avance de obra", icon: HardHat, href: "/avance-obra" },
  { label: "Reportes", icon: FolderKanban, href: "/reportes" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="app-shell">
      {menuOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark"><Building2 size={22} /></div>
          <div><strong>Malabrigo</strong><span>Club Resort</span></div>
          <button className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <nav className="nav-list" aria-label="Navegación principal">
          {navigation.map(({ label, icon: Icon, href }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link className={active ? "nav-item active" : "nav-item"} href={href} key={href} onClick={() => setMenuOpen(false)}>
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link className={pathname.startsWith("/configuracion") ? "nav-item active" : "nav-item"} href="/configuracion" onClick={() => setMenuOpen(false)}><Settings size={18} />Configuración</Link>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <label className="search-box"><Search size={17} /><input aria-label="Buscar" placeholder="Buscar socio, venta o comprobante..." /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions">
            <button className="icon-button notification" aria-label="Notificaciones"><Bell size={19} /><i /></button>
            <div className="profile"><div className="avatar">JM</div><div><strong>Johanna Mateo</strong><span>Dirección</span></div><ChevronDown size={16} /></div>
          </div>
        </header>
        <div className="content">{children}</div>
      </section>
    </main>
  );
}
