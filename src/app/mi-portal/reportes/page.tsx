import { connection } from "next/server";
import { ChartNoAxesCombined, CircleDollarSign, Landmark } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";
import { formatDate, formatMoney, statusTone } from "@/lib/format";

export default async function MyReportsPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={ChartNoAxesCombined} title="Perfil no disponible" description="Tu cuenta no tiene un perfil de socio asociado." />;
  await connection();
  const sales = await db.sale.findMany({ where: { memberId: user.member.id }, orderBy: { createdAt: "desc" }, include: { program: true, payments: { where: { status: "CONFIRMED" } }, installments: { orderBy: { dueDate: "asc" } }, shareAllocation: true, stayAllocation: true } });
  const invested = sales.reduce((sum, sale) => sum + sale.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0), 0);
  const contracted = sales.filter((sale) => sale.status !== "CANCELLED").reduce((sum, sale) => sum + Number(sale.totalPrice), 0);
  const pendingInstallments = sales.flatMap((sale) => sale.installments.map((installment) => ({ ...installment, saleCode: sale.code, program: sale.program.name }))).filter((item) => ["PENDING", "IN_REVIEW", "OVERDUE"].includes(item.status));
  return <><PageHeader eyebrow="Portal del socio" title="Mis reportes" description="Resumen financiero y contractual de tus inversiones." />
    <section className="module-metrics"><MetricCard label="Valor contratado" value={formatMoney(contracted)} detail={`${sales.length} inversiones`} icon={Landmark} /><MetricCard label="Total pagado" value={formatMoney(invested)} detail="Pagos confirmados" icon={CircleDollarSign} /><MetricCard label="Saldo estimado" value={formatMoney(Math.max(0, contracted - invested))} detail="Pendiente de pago" icon={ChartNoAxesCombined} /></section>
    <section className="report-grid portal-section"><article className="module-panel"><div className="module-toolbar"><div><h2>Resumen por inversión</h2><p>Valores y beneficios asignados</p></div></div>{sales.length ? <div className="table-wrap module-table"><table><thead><tr><th>Programa</th><th>Estado</th><th>Contratado</th><th>Pagado</th><th>Acciones</th><th>Días</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td>{sale.program.name}</td><td><StatusPill tone={statusTone(sale.status)}>{sale.status}</StatusPill></td><td className="money">{formatMoney(sale.totalPrice)}</td><td className="money">{formatMoney(sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0))}</td><td>{sale.shareAllocation?.quantity ?? 0}</td><td>{sale.stayAllocation?.days ?? 0}</td></tr>)}</tbody></table></div> : <EmptyState icon={Landmark} title="Sin inversiones" description="Todavía no existen datos para generar tu reporte." />}</article><article className="module-panel"><div className="module-toolbar"><div><h2>Próximas cuotas</h2><p>Obligaciones pendientes</p></div></div>{pendingInstallments.length ? <div className="settings-list">{pendingInstallments.slice(0, 8).map((item) => <div key={item.id}><span><strong>{item.program}</strong><small>{item.saleCode} · vence {formatDate(item.dueDate)}</small></span><b>{formatMoney(Number(item.amount) - Number(item.paidAmount))}</b></div>)}</div> : <EmptyState icon={CircleDollarSign} title="Sin cuotas pendientes" description="No tienes obligaciones próximas registradas." />}</article></section>
  </>;
}
