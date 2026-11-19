import { redirect } from "next/navigation";
import { Coins, Network } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser, roleCodes } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate, formatMoney, statusTone } from "@/lib/format";

const commissionLabels = { PENDING: "Pendiente", APPROVED: "Aprobada", PAID: "Pagada", REVERSED: "Reversada" } as const;

export default async function MyCommissionsPage() {
  const user = await requireUser();
  if (!roleCodes(user).includes("AMBASSADOR") || !user.member?.ambassadorProfile) redirect("/mi-portal");
  const profile = await db.ambassadorProfile.findUniqueOrThrow({
    where: { id: user.member.ambassadorProfile.id },
    select: {
      commissions: { orderBy: { createdAt: "desc" }, take: 100 },
      rankBonuses: { orderBy: { period: "desc" } },
    },
  });
  const pending = profile.commissions.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + Number(item.amount), 0);

  return <>
    <PageHeader eyebrow="Portal del embajador" title="Mis comisiones" description="Consulta los ingresos directos e indirectos de tu red y tus bonos mensuales." />
    <section className="module-metrics" aria-label="Resumen de comisiones"><MetricCard label="Comisiones pendientes" value={formatMoney(pending)} detail="Pendientes de aprobación" icon={Coins} /></section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Mis comisiones</h2><p>Ingresos directos e indirectos de tu red.</p></div></div>{profile.commissions.length ? <div className="table-wrap module-table"><table><thead><tr><th>Nivel</th><th>Monto</th><th>Puntos</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{profile.commissions.map((item) => <tr key={item.id}><td>{item.generation === 1 ? "Directa" : `Generación ${item.generation}`}</td><td className="money">{formatMoney(item.amount)}</td><td>{item.points}</td><td><StatusPill tone={statusTone(item.status)}>{commissionLabels[item.status]}</StatusPill></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Network} title="Aún no hay comisiones" description="Se mostrarán cuando las ventas patrocinadas cumplan el pago requerido." />}</section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Bonos mensuales</h2><p>Pagos por rango.</p></div></div>{profile.rankBonuses.length ? <div className="record-list padded-list">{profile.rankBonuses.map((item) => <div key={item.id}><div><strong>{formatMoney(item.amount)}</strong><span>{formatDate(item.period)}</span></div><StatusPill tone={statusTone(item.status)}>{commissionLabels[item.status]}</StatusPill></div>)}</div> : <EmptyState icon={Coins} title="Sin bonos" description="Los bonos se generan al alcanzar un rango." />}</section>
  </>;
}
