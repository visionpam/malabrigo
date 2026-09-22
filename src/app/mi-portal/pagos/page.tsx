import { connection } from "next/server";
import { CircleDollarSign, Clock3, ReceiptText } from "lucide-react";

import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";
import { formatDate, formatMoney, statusTone } from "@/lib/format";
import { paymentConceptLabels } from "@/lib/payment-concepts";
import { PaymentSubmissionForm } from "./payment-submission-form";

const submissionLabel = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado" } as const;

export default async function MyPaymentsPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={ReceiptText} title="Perfil no disponible" description="Tu cuenta no tiene un perfil de socio asociado." />;
  await connection();
  const memberId = user.member.id;
  const [sales, payments, submissions] = await Promise.all([
    db.sale.findMany({ where: { memberId, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, include: { program: true } }),
    db.payment.findMany({ where: { sale: { memberId } }, orderBy: { paidAt: "desc" }, include: { sale: { include: { program: true } } } }),
    db.paymentSubmission.findMany({ where: { sale: { memberId } }, orderBy: { submittedAt: "desc" }, select: { id: true, concept: true, amount: true, submittedAt: true, status: true, voucherUrl: true, sale: { include: { program: true } } } }),
  ]);
  const confirmed = payments.filter((payment) => payment.status === "CONFIRMED");
  return <><PageHeader eyebrow="Portal del socio" title="Mis pagos" description="Consulta tus pagos y envía comprobantes para aprobación." />
    <section className="module-metrics"><MetricCard label="Pagos confirmados" value={String(confirmed.length)} detail={formatMoney(confirmed.reduce((sum, payment) => sum + Number(payment.amount), 0))} icon={CircleDollarSign} /><MetricCard label="Por aprobar" value={String(submissions.filter((item) => item.status === "PENDING").length)} detail="Comprobantes enviados" icon={Clock3} /><MetricCard label="Inversiones" value={String(sales.length)} detail="Disponibles para pagos" icon={ReceiptText} /></section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Subir comprobante</h2><p>El administrador validará el desprendible antes de aplicarlo a tu cuenta.</p></div></div>{sales.length ? <PaymentSubmissionForm sales={sales.map((sale) => ({ id: sale.id, code: sale.code, program: sale.program.name }))} /> : <EmptyState icon={ReceiptText} title="No tienes inversiones disponibles" description="Necesitas una venta vigente para presentar un pago." />}</section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Comprobantes enviados</h2><p>Seguimiento de la revisión administrativa</p></div></div>{submissions.length ? <div className="table-wrap module-table"><table><thead><tr><th>Inversión</th><th>Programa</th><th>Concepto</th><th>Monto</th><th>Enviado</th><th>Estado</th><th>Comprobante</th></tr></thead><tbody>{submissions.map((item) => <tr key={item.id}><td className="money">{item.sale.code}</td><td>{item.sale.program.name}</td><td>{paymentConceptLabels[item.concept]}</td><td className="money">{formatMoney(item.amount)}</td><td>{formatDate(item.submittedAt)}</td><td><StatusPill tone={statusTone(item.status)}>{submissionLabel[item.status]}</StatusPill></td><td><a className="row-action" href={item.voucherUrl} target="_blank" rel="noreferrer">Ver archivo</a></td></tr>)}</tbody></table></div> : <EmptyState icon={Clock3} title="Sin comprobantes" description="Los comprobantes que envíes aparecerán aquí." />}</section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Pagos aplicados</h2><p>Solo movimientos asociados a tu cuenta</p></div></div>{payments.length ? <div className="table-wrap module-table"><table><thead><tr><th>Referencia</th><th>Inversión</th><th>Programa</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td className="money">{payment.reference}</td><td>{payment.sale.code}</td><td>{payment.sale.program.name}</td><td>{paymentConceptLabels[payment.concept]}</td><td className="money">{formatMoney(payment.amount)}</td><td>{formatDate(payment.paidAt)}</td><td><StatusPill tone={statusTone(payment.status)}>{payment.status === "CONFIRMED" ? "Confirmado" : "Anulado"}</StatusPill></td></tr>)}</tbody></table></div> : <EmptyState icon={ReceiptText} title="Sin pagos aplicados" description="Los pagos aprobados aparecerán en este historial." />}</section>
  </>;
}
