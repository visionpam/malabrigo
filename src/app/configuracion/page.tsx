import { connection } from "next/server";
import Link from "next/link";
import { KeyRound, Settings, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requirePermission } from "@/lib/access-control";
import { ProgramAdminDialog } from "./program-admin-dialog";

export default async function SettingsPage() {
  await requirePermission("SETTINGS");
  await connection();
  const [roles, programs] = await Promise.all([db.role.findMany({ orderBy: { name: "asc" } }), db.program.findMany({ orderBy: { cashPrice: "asc" }, include: { financingPlans: { orderBy: { termMonths: "asc" } } } })]);
  const programOptions = programs.map((program) => ({ id: program.id, name: program.name, cashPrice: Number(program.cashPrice), separation: Number(program.separation), cashShares: program.cashShares, cashStayDays: program.cashStayDays, beneficiaryCap: program.beneficiaryCap, marriedBeneficiaryCap: program.marriedBeneficiaryCap, membershipName: program.membershipName ?? "", shareholderCategory: program.shareholderCategory ?? "", observations: program.observations ?? "", active: program.active, plans: program.financingPlans.map((plan) => ({ id: plan.id, termMonths: plan.termMonths, downPayment: Number(plan.downPayment), financedAmount: Number(plan.financedAmount), monthlyPayment: Number(plan.monthlyPayment), sharesGranted: plan.sharesGranted, stayDaysGranted: plan.stayDaysGranted, active: plan.active })) }));
  return <><PageHeader eyebrow="Administración" title="Configuración" description="Catálogos operativos, programas y permisos de la plataforma." action={<Link className="primary-button" href="/mi-cuenta/seguridad"><KeyRound size={17} /> Mi contraseña</Link>} />
    <section className="settings-grid"><article className="module-panel"><div className="module-toolbar"><div><h2><ShieldCheck size={17} /> Roles del sistema</h2><p>Perfiles disponibles</p></div></div>{roles.length === 0 ? <EmptyState icon={Settings} title="Sin roles" description="Ejecuta la carga de catálogos iniciales." /> : <div className="settings-list">{roles.map((role) => <div key={role.id}><span><strong>{role.name}</strong><small>{role.description}</small></span></div>)}</div>}</article><article className="module-panel"><div className="module-toolbar"><div><h2><SlidersHorizontal size={17} /> Programas</h2><p>Precios y financiación</p></div><ProgramAdminDialog programs={programOptions} /></div><div className="settings-list">{programs.map((program) => <div key={program.id}><span><strong>{program.name}</strong><small>{program.financingPlans.filter((plan) => plan.active).length} plazos activos</small></span><b>{formatMoney(program.cashPrice)}</b></div>)}</div></article></section>
  </>;
}
