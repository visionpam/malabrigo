import { connection } from "next/server";
import { CircleDollarSign, Clock3, ReceiptText } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatDate, formatMoney, statusTone } from "@/lib/format";
import { PaymentCreateDialog, PaymentManageDialog } from "./payment-dialogs";

export default async function PaymentsPage() {
  await connection();
  const [payments, pending, overdue, paid, sales] = await Promise.all([
    db.payment.findMany({ take: 100, orderBy: [{ paidAt: "desc" }, { confirmedAt: "desc" }], include: { sale: { include: { member: true, program: true } } } }),
    db.paymentSubmission.count({ where: { status: "PENDING" } }), db.installment.count({ where: { status: "OVERDUE" } }), db.payment.aggregate({ where: { status: "CONFIRMED" }, _sum: { amount: true } }),
    db.sale.findMany({ where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, include: { member: true, program: true } }),
  ]);
  const history = payments.length ? await db.auditLog.findMany({ where: { entityType: "Payment", entityId: { in: payments.map((payment) => payment.id) } }, orderBy: { createdAt: "desc" }, take: 500 }) : [];
  const historyByPayment = new Map<string, typeof history>(); for (const item of history) historyByPayment.set(item.entityId, [...(historyByPayment.get(item.entityId) ?? []), item]);
  const saleOptions = sales.map((sale) => ({ id: sale.id, code: sale.code, member: `${sale.member.firstName} ${sale.member.lastName}`, program: sale.program.name, mode: sale.mode, status: sale.status }));
  const conceptLabel = { SEPARATION: "Separación", DOWN_PAYMENT: "Cuota inicial", INSTALLMENT: "Cuota", OTHER: "Otro" } as const;
  return <><PageHeader eyebrow="Finanzas" title="Pagos" description="Registro, corrección, anulación y aplicación automática de pagos." action={<PaymentCreateDialog sales={saleOptions} />} />
    <section className="module-metrics"><MetricCard label="Por validar" value={String(pending)} detail="Comprobantes pendientes" icon={ReceiptText} /><MetricCard label="Cuotas vencidas" value={String(overdue)} detail="Requieren seguimiento" icon={Clock3} /><MetricCard label="Pagos confirmados" value={formatMoney(paid._sum.amount)} detail="Acumulado registrado" icon={CircleDollarSign} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Registro de pagos</h2><p>Movimientos confirmados y anulados conservados para auditoría</p></div></div>{payments.length === 0 ? <EmptyState icon={ReceiptText} title="No hay pagos registrados" description="Los pagos confirmados aparecerán aquí con sus acciones contables." /> : <div className="table-wrap module-table"><table><thead><tr><th>Referencia</th><th>Socio</th><th>Venta</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td className="money">{payment.reference}</td><td>{payment.sale.member.firstName} {payment.sale.member.lastName}</td><td>{payment.sale.code}</td><td>{conceptLabel[payment.concept]}</td><td className="money">{formatMoney(payment.amount)}</td><td>{formatDate(payment.paidAt)}</td><td><StatusPill tone={statusTone(payment.status)}>{payment.status === "CONFIRMED" ? "Confirmado" : "Anulado"}</StatusPill></td><td><PaymentManageDialog sales={saleOptions} payment={{ id: payment.id, saleId: payment.saleId, reference: payment.reference, amount: Number(payment.amount), concept: payment.concept, paidAt: payment.paidAt.toISOString().slice(0, 10), status: payment.status, history: (historyByPayment.get(payment.id) ?? []).map((item) => ({ id: item.id.toString(), action: item.action, createdAt: formatDate(item.createdAt) })) }} /></td></tr>)}</tbody></table></div>}</section>
  </>;
}
