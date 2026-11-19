import { redirect } from "next/navigation";
import { Award, Coins, Network, UsersRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser, roleCodes } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatMoney, statusTone } from "@/lib/format";
import { getAmbassadorNetwork } from "@/lib/network";

const commissionLabels = { PENDING: "Pendiente", APPROVED: "Aprobada", PAID: "Pagada", REVERSED: "Reversada" } as const;

export default async function AmbassadorReportsPage() {
  const user = await requireUser();
  if (!roleCodes(user).includes("AMBASSADOR") || !user.member?.ambassadorProfile) redirect("/mi-portal");
  const ambassadorId = user.member.ambassadorProfile.id;
  const [levels, profile] = await Promise.all([
    getAmbassadorNetwork(ambassadorId),
    db.ambassadorProfile.findUniqueOrThrow({
      where: { id: ambassadorId },
      select: {
        commissions: { select: { status: true, amount: true } },
        rankBonuses: { select: { status: true, amount: true } },
        awards: { select: { id: true } },
      },
    }),
  ]);
  const people = levels.flatMap((level) => level.people);
  const commissions = Object.entries(commissionLabels).map(([status, label]) => ({
    status,
    label,
    count: profile.commissions.filter((item) => item.status === status).length,
    amount: profile.commissions.filter((item) => item.status === status).reduce((sum, item) => sum + Number(item.amount), 0),
  }));
  const bonusTotal = profile.rankBonuses.filter((item) => item.status !== "REVERSED").reduce((sum, item) => sum + Number(item.amount), 0);
  const bonuses = Object.entries(commissionLabels).map(([status, label]) => ({
    status,
    label,
    count: profile.rankBonuses.filter((item) => item.status === status).length,
    amount: profile.rankBonuses.filter((item) => item.status === status).reduce((sum, item) => sum + Number(item.amount), 0),
  }));

  return <>
    <PageHeader eyebrow="Portal del embajador" title="Mis reportes" description="Resumen de tu red, comisiones, bonos y reconocimientos." />
    <section className="module-metrics" aria-label="Resumen del embajador">
      <MetricCard label="Socios en mi red" value={String(people.length)} detail={`${levels[0]?.people.length ?? 0} directos`} icon={UsersRound} />
      <MetricCard label="Comisiones" value={formatMoney(commissions.filter((item) => item.status !== "REVERSED").reduce((sum, item) => sum + item.amount, 0))} detail="Generadas en tu red" icon={Coins} />
      <MetricCard label="Premios obtenidos" value={String(profile.awards.length)} detail="Reconocimientos de carrera" icon={Award} />
    </section>
    <section className="report-grid portal-section">
      <article className="module-panel"><div className="module-toolbar"><div><h2>Red por generaciones</h2><p>Personas registradas en tus ocho niveles.</p></div></div>{people.length ? <div className="settings-list">{levels.map((level) => <div key={level.level}><span><strong>Generación {level.level}</strong></span><b>{level.people.length}</b></div>)}</div> : <EmptyState icon={Network} title="Sin socios en la red" description="Aquí aparecerá el resumen cuando registres socios." />}</article>
      <article className="module-panel"><div className="module-toolbar"><div><h2>Estado de comisiones</h2><p>Movimientos directos e indirectos.</p></div></div>{profile.commissions.length ? <div className="settings-list">{commissions.filter((item) => item.count > 0).map((item) => <div key={item.status}><span><strong>{item.label}</strong><small>{item.count} movimientos</small></span><b>{formatMoney(item.amount)}</b></div>)}</div> : <EmptyState icon={Coins} title="Sin comisiones" description="Los movimientos aparecerán cuando se generen comisiones." />}</article>
    </section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Bonos mensuales</h2><p>Resumen de bonos por estado.</p></div></div>{profile.rankBonuses.length ? <div className="settings-list"><div><span><strong>Total vigente</strong><small>Bonos no reversados</small></span><b>{formatMoney(bonusTotal)}</b></div>{bonuses.filter((item) => item.count > 0).map((item) => <div key={item.status}><span><StatusPill tone={statusTone(item.status)}>{item.label}</StatusPill><small>{item.count} bonos</small></span><b>{formatMoney(item.amount)}</b></div>)}</div> : <EmptyState icon={Award} title="Sin bonos" description="Los bonos se mostrarán cuando alcances un rango." />}</section>
  </>;
}
