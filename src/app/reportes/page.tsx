import { connection } from "next/server";
import { BarChart3, CircleDollarSign, PieChart, UsersRound } from "lucide-react";
import { MetricCard, PageHeader } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function ReportsPage() {
  await connection();
  const [members, sales, payments, shares, programs] = await Promise.all([
    db.member.count(), db.sale.count(), db.payment.aggregate({ where: { status: "CONFIRMED" }, _sum: { amount: true } }), db.shareAllocation.aggregate({ _sum: { quantity: true } }), db.program.findMany({ orderBy: { cashPrice: "asc" }, include: { _count: { select: { sales: true } } } }),
  ]);
  const issuedShares = shares._sum.quantity ?? 0;
  return <><PageHeader eyebrow="Inteligencia operativa" title="Reportes" description="Indicadores comerciales, financieros y de participación accionaria." />
    <section className="module-metrics"><MetricCard label="Socios" value={String(members)} detail="Expedientes registrados" icon={UsersRound} /><MetricCard label="Ventas" value={String(sales)} detail="Operaciones totales" icon={BarChart3} /><MetricCard label="Cobranza" value={formatMoney(payments._sum.amount)} detail="Pagos confirmados" icon={CircleDollarSign} /><MetricCard label="Acciones emitidas" value={issuedShares.toLocaleString("es-PE")} detail={`${(2250000 - issuedShares).toLocaleString("es-PE")} disponibles`} icon={PieChart} /></section>
    <section className="report-grid"><article className="module-panel"><div className="module-toolbar"><div><h2>Ventas por programa</h2><p>Distribución actual del portafolio</p></div></div><div className="program-report">{programs.map((program) => <div key={program.id}><span><strong>{program.name}</strong><small>{formatMoney(program.cashPrice)}</small></span><b>{program._count.sales}</b></div>)}</div></article><article className="module-panel report-capacity"><span className="panel-kicker">Capital accionario</span><h2>Control de emisión</h2><div className="capacity-number"><strong>{((issuedShares / 2250000) * 100).toFixed(2)}%</strong><span>del límite utilizado</span></div><div className="capacity-bar"><i style={{ width: `${Math.min(100, issuedShares / 22500)}%` }} /></div><p>El control en PostgreSQL impide superar las 2.250.000 acciones.</p></article></section>
  </>;
}
