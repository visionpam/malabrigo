import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, CalendarDays, CircleDollarSign, FileCheck2, HardHat, ReceiptText, ShieldCheck, TrendingUp, Upload, UserRoundPlus, UsersRound } from "lucide-react";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

const monthLabels = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const submissionLabels = { PENDING: "Por validar", APPROVED: "Aprobado", REJECTED: "Rechazado" } as const;

export default async function DashboardPage() {
  const user = await requirePermission("DASHBOARD");
  await connection();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const monthName = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" }).format(now);
  const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

  const [activeMembers, collectedMonth, pendingSubmissions, allocatedShares, yearlyPayments, recentSubmissions, stages, unsignedContracts] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.payment.aggregate({ where: { status: "CONFIRMED", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.paymentSubmission.count({ where: { status: "PENDING" } }),
    db.shareAllocation.aggregate({ _sum: { quantity: true } }),
    db.payment.findMany({ where: { status: "CONFIRMED", paidAt: { gte: yearStart } }, select: { amount: true, paidAt: true } }),
    db.paymentSubmission.findMany({ take: 5, orderBy: { submittedAt: "desc" }, include: { sale: { include: { member: true, program: true } } } }),
    db.projectStage.findMany({ orderBy: { sortOrder: "asc" }, include: { updates: { orderBy: { occurredAt: "desc" }, take: 1 } } }),
    db.contract.count({ where: { status: { in: ["DRAFT", "GENERATED", "SENT"] } } }),
  ]);

  const monthlyRevenue = Array.from({ length: 12 }, () => 0);
  for (const payment of yearlyPayments) monthlyRevenue[payment.paidAt.getUTCMonth()] += Number(payment.amount);
  const maxRevenue = Math.max(...monthlyRevenue, 1);
  const annualRevenue = monthlyRevenue.reduce((sum, value) => sum + value, 0);
  const projectProgress = stages.length ? stages.reduce((sum, stage) => sum + Number(stage.weight) * Number(stage.updates[0]?.progress ?? 0), 0) / 100 : 0;
  const currentStage = stages.find((stage) => Number(stage.updates[0]?.progress ?? 0) < 100) ?? stages.at(-1);
  const kpis = [
    { label: "Socios activos", value: activeMembers.toLocaleString("es-PE"), detail: "Expedientes con acceso vigente", icon: UsersRound },
    { label: "Cobrado este mes", value: formatMoney(collectedMonth._sum.amount), detail: monthName, icon: CircleDollarSign },
    { label: "Comprobantes pendientes", value: String(pendingSubmissions), detail: pendingSubmissions ? "Requieren validación" : "Sin pendientes", icon: ReceiptText },
    { label: "Acciones asignadas", value: Number(allocatedShares._sum.quantity ?? 0).toLocaleString("es-PE"), detail: "Según ventas activadas", icon: ShieldCheck },
  ];
  const firstName = user.displayName.split(" ")[0];

  return <>
    <div className="page-heading"><div><span className="eyebrow">Panel ejecutivo</span><h1>Buenos días, {firstName}</h1><p>Información operativa sincronizada con PostgreSQL.</p></div><div className="heading-actions"><div className="date-button" aria-label={`Periodo actual: ${monthName}`}><CalendarDays size={17} />{monthName}</div><Link className="primary-button" href="/socios"><UserRoundPlus size={17} /> Nuevo socio</Link></div></div>
    <section className="kpi-grid" aria-label="Indicadores principales">{kpis.map(({ label, value, detail, icon: Icon }) => <article className="kpi-card" key={label}><div className="kpi-icon"><Icon aria-hidden="true" size={21} /></div><div className="kpi-content"><span>{label}</span><strong>{value}</strong><small><TrendingUp aria-hidden="true" size={13} />{detail}</small></div></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel revenue-panel"><div className="panel-header"><div><span className="panel-kicker">Flujo financiero</span><h2>Ingresos confirmados</h2></div><span className="panel-period">Año {now.getUTCFullYear()}</span></div><div className="revenue-summary"><strong>{formatMoney(annualRevenue)}</strong><span><ArrowUpRight size={14} /> acumulado</span></div><div className="bar-chart" role="img" aria-label={`Ingresos confirmados del año: ${formatMoney(annualRevenue)}`}>{monthlyRevenue.map((value, index) => <div className="bar-column" key={index} title={`${monthLabels[index]}: ${formatMoney(value)}`}><i style={{ height: `${value ? Math.max(8, value / maxRevenue * 100) : 3}%` }} /><span>{monthLabels[index]}</span></div>)}</div></article>
      <article className="panel project-panel"><div className="panel-header"><div><span className="panel-kicker">Proyecto</span><h2>Avance de obra</h2></div></div><div className="progress-ring" style={{ "--progress": `${Math.min(100, projectProgress)}%` } as React.CSSProperties}><div><strong>{projectProgress.toFixed(1)}%</strong><span>general</span></div></div><div className="stage-copy"><strong>{currentStage?.name ?? "Cronograma pendiente"}</strong><span>{currentStage?.description ?? "Configura las etapas oficiales del proyecto."}</span><small>{stages.length} etapas registradas</small></div><Link className="secondary-button" href="/avance-obra"><Upload size={16} /> Ver avance</Link></article>
      <article className="panel payments-panel"><div className="panel-header"><div><span className="panel-kicker">Finanzas</span><h2>Comprobantes recientes</h2></div><Link className="text-link" href="/pagos">Ver todos <ArrowUpRight size={14} /></Link></div>{recentSubmissions.length === 0 ? <div className="compact-empty">Todavía no se han enviado comprobantes.</div> : <div className="table-wrap"><table><thead><tr><th>Socio</th><th>Programa</th><th>Monto</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{recentSubmissions.map((submission) => { const memberName = `${submission.sale.member.firstName} ${submission.sale.member.lastName}`; return <tr key={submission.id}><td><div className="member-cell"><span>{memberName.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><strong>{memberName}</strong></div></td><td>{submission.sale.program.name}</td><td className="money">{formatMoney(submission.amount)}</td><td>{dateTimeFormatter.format(submission.submittedAt)}</td><td><span className={`status ${submission.status.toLowerCase()}`}>{submissionLabels[submission.status]}</span></td></tr>; })}</tbody></table></div>}</article>
      <article className="panel actions-panel"><div className="panel-header"><div><span className="panel-kicker">Atención requerida</span><h2>Acciones pendientes</h2></div></div><div className="action-list"><Link href="/pagos"><span className="action-icon orange"><ReceiptText size={17} /></span><div><strong>Validar comprobantes</strong><small>{pendingSubmissions} pendientes</small></div><ArrowUpRight size={16} /></Link><Link href="/contratos"><span className="action-icon blue"><FileCheck2 size={17} /></span><div><strong>Gestionar contratos</strong><small>{unsignedContracts} sin firmar</small></div><ArrowUpRight size={16} /></Link><Link href="/avance-obra"><span className="action-icon green"><HardHat size={17} /></span><div><strong>Actualizar avance</strong><small>{stages.length} etapas configuradas</small></div><ArrowUpRight size={16} /></Link></div></article>
    </section>
  </>;
}
