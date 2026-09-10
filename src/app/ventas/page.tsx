import { connection } from "next/server";
import { Landmark, ShoppingBag, TrendingUp } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatDate, formatMoney, saleStatusLabel, statusTone } from "@/lib/format";
import { SaleCreateDialog } from "./sale-create-dialog";
import { SaleManageDialog } from "./sale-manage-dialog";
import { requirePermission } from "@/lib/access-control";

export default async function SalesPage() {
  await requirePermission("SALES");
  await connection();
  const [sales, total, active, volume, members, programs] = await Promise.all([
    db.sale.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { member: true, program: true, financingPlan: true, payments: { where: { status: "CONFIRMED" } }, installments: { orderBy: { number: "asc" } } } }),
    db.sale.count(), db.sale.count({ where: { status: "ACTIVE" } }), db.sale.aggregate({ _sum: { totalPrice: true } }),
    db.member.findMany({ where: { status: { notIn: ["SUSPENDED", "WITHDRAWN"] }, investorProfile: { isNot: null } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true } }),
    db.program.findMany({ where: { active: true }, orderBy: { cashPrice: "asc" }, include: { financingPlans: { where: { active: true }, orderBy: { termMonths: "asc" } } } }),
  ]);
  const history = sales.length ? await db.auditLog.findMany({ where: { entityType: "Sale", entityId: { in: sales.map((sale) => sale.id) } }, orderBy: { createdAt: "desc" }, take: 500 }) : [];
  const historyBySale = new Map<string, typeof history>();
  for (const item of history) historyBySale.set(item.entityId, [...(historyBySale.get(item.entityId) ?? []), item]);
  const memberOptions = members.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}`, document: `${member.documentType} ${member.documentNumber}` }));
  const programOptions = programs.map((program) => ({ id: program.id, name: program.name, cashPrice: Number(program.cashPrice), separation: Number(program.separation), plans: program.financingPlans.map((plan) => ({ id: plan.id, termMonths: plan.termMonths, downPayment: Number(plan.downPayment), financedAmount: Number(plan.financedAmount), monthlyPayment: Number(plan.monthlyPayment) })) }));
  return <><PageHeader eyebrow="Operación comercial" title="Ventas" description="Separaciones, contratos de programa y modalidades de pago." action={<SaleCreateDialog members={memberOptions} programs={programOptions} />} />
    <section className="module-metrics"><MetricCard label="Ventas" value={String(total)} detail="Registros totales" icon={ShoppingBag} /><MetricCard label="Activas" value={String(active)} detail="Contratos vigentes" icon={Landmark} /><MetricCard label="Volumen contratado" value={formatMoney(volume._sum.totalPrice)} detail="Valor nominal" icon={TrendingUp} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Registro de ventas</h2><p>Información sincronizada con PostgreSQL</p></div></div>{sales.length === 0 ? <EmptyState icon={ShoppingBag} title="No hay ventas registradas" description="Las nuevas separaciones y contratos aparecerán en este módulo." /> : <div className="table-wrap module-table"><table><thead><tr><th>Código</th><th>Socio</th><th>Programa</th><th>Modalidad</th><th>Valor</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td className="money">{sale.code}</td><td>{sale.member.firstName} {sale.member.lastName}</td><td>{sale.program.name}</td><td>{sale.mode === "CASH" ? "Contado" : `${sale.financingPlan?.termMonths ?? "—"} meses`}</td><td className="money">{formatMoney(sale.totalPrice)}</td><td><StatusPill tone={statusTone(sale.status)}>{saleStatusLabel[sale.status]}</StatusPill></td><td>{formatDate(sale.createdAt)}</td><td><SaleManageDialog sale={{ id: sale.id, code: sale.code, member: `${sale.member.firstName} ${sale.member.lastName}`, program: sale.program.name, mode: sale.mode, termMonths: sale.financingPlan?.termMonths ?? null, status: sale.status, totalPrice: Number(sale.totalPrice), separationAmount: Number(sale.separationAmount), downPaymentAmount: Number(sale.downPaymentAmount), confirmedPayments: sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0), signedAt: sale.signedAt ? formatDate(sale.signedAt) : null, installments: sale.installments.map((item) => ({ number: item.number, amount: Number(item.amount), dueDate: formatDate(item.dueDate), status: item.status })), history: (historyBySale.get(sale.id) ?? []).map((item) => ({ id: item.id.toString(), action: item.action, createdAt: formatDate(item.createdAt) })) }} /></td></tr>)}</tbody></table></div>}</section>
  </>;
}
