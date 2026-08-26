import { connection } from "next/server";
import { Settings, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { EmptyState, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function SettingsPage() {
  await connection();
  const [roles, programs] = await Promise.all([db.role.findMany({ orderBy: { name: "asc" } }), db.program.findMany({ orderBy: { cashPrice: "asc" }, include: { financingPlans: { where: { active: true }, orderBy: { termMonths: "asc" } } } })]);
  return <><PageHeader eyebrow="Administración" title="Configuración" description="Catálogos operativos, programas y permisos de la plataforma." />
    <section className="settings-grid"><article className="module-panel"><div className="module-toolbar"><div><h2><ShieldCheck size={17} /> Roles del sistema</h2><p>Perfiles disponibles</p></div></div>{roles.length === 0 ? <EmptyState icon={Settings} title="Sin roles" description="Ejecuta la carga de catálogos iniciales." /> : <div className="settings-list">{roles.map((role) => <div key={role.id}><span><strong>{role.name}</strong><small>{role.description}</small></span><StatusPill tone="info">{role.code}</StatusPill></div>)}</div>}</article><article className="module-panel"><div className="module-toolbar"><div><h2><SlidersHorizontal size={17} /> Programas</h2><p>Precios y financiación</p></div></div><div className="settings-list">{programs.map((program) => <div key={program.id}><span><strong>{program.name}</strong><small>{program.financingPlans.length} plazos activos</small></span><b>{formatMoney(program.cashPrice)}</b></div>)}</div></article></section>
  </>;
}
