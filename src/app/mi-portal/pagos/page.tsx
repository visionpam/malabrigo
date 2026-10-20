import { connection } from "next/server";
import { CircleDollarSign, Clock3, Download, Eye, ReceiptText } from "lucide-react";

import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { formatDate, formatMoney } from "@/lib/format";
import { getInvestorPaymentStatement } from "@/lib/investor-payment-statement";

export default async function MyPaymentsPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={ReceiptText} title="Perfil no disponible" description="Tu cuenta no tiene un perfil de socio asociado." />;
  await connection();
  const statement = await getInvestorPaymentStatement(user.member.id);

  return <>
    <PageHeader eyebrow="Portal del inversionista" title="Mis pagos" description="Consulta el valor de tus programas, cuotas y pagos registrados por administración." />
    <section className="module-metrics" aria-label="Resumen de pagos">
      <MetricCard label="Valor del programa" value={formatMoney(statement.contracted)} detail="Programas vigentes" icon={CircleDollarSign} />
      <MetricCard label="Saldo pendiente" value={formatMoney(statement.balance)} detail={`${formatMoney(statement.paid)} pagados`} icon={Clock3} />
      <MetricCard label="N° de cuotas" value={String(statement.installments)} detail={`${statement.pendingInstallments} por completar`} icon={ReceiptText} />
    </section>

    <section className="module-panel portal-section"><div className="module-toolbar investor-payment-toolbar"><div><h2>Mis comprobantes de pago</h2><p>Resumen por proyecto y programa. Los soportes disponibles se consultan en el seguimiento.</p></div><a className="secondary-button" href="/mi-portal/pagos/exportar" download="seguimiento-pagos.csv"><Download size={17} aria-hidden="true" />Exportar seguimiento</a></div>
      {statement.investmentRows.length ? <div className="table-wrap module-table investor-payments-table"><table><thead><tr><th>Proyecto / programa</th><th>Modalidad</th><th>Valor del programa</th><th>Monto pagado</th><th>Saldo pendiente</th><th>N° de cuotas</th></tr></thead><tbody>{statement.investmentRows.map((sale) => <tr key={sale.id}><td><strong>{sale.project} / {sale.program}</strong><small className="cell-secondary">{sale.code}</small></td><td>{sale.mode}</td><td className="money">{formatMoney(sale.value)}</td><td className="money">{formatMoney(sale.paid)}</td><td className="money">{formatMoney(sale.balance)}</td><td>{sale.installments ? sale.installments : "No aplica"}</td></tr>)}</tbody></table></div> : <EmptyState icon={ReceiptText} title="Sin programas vigentes" description="Cuando tengas una inversión vigente aparecerá aquí su resumen de pagos." />}
    </section>

    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Seguimiento de pagos</h2><p>Movimientos y comprobantes asociados a tus programas</p></div></div>
      {statement.paymentRows.length ? <div className="table-wrap module-table investor-payments-table"><table><thead><tr><th>Proyecto</th><th>Programa</th><th>Concepto</th><th>Monto</th><th>Fecha de pago</th><th>Comprobante</th></tr></thead><tbody>{statement.paymentRows.map((item) => <tr key={item.id}><td><strong>{item.project}</strong><small className="cell-secondary">{item.code}</small></td><td>{item.program}</td><td><span className="investor-payment-concept">{item.concept}</span><StatusPill tone={item.status === "Confirmado" ? "success" : item.status === "Pendiente" ? "warning" : "danger"}>{item.status}</StatusPill>{item.submittedAt && <small className="cell-secondary">Enviado el {formatDate(item.submittedAt)}</small>}{item.rejectionReason && <small className="cell-secondary investor-payment-rejection">Motivo: {item.rejectionReason}</small>}</td><td className="money">{formatMoney(item.amount)}</td><td>{item.paidAt ? formatDate(item.paidAt) : "Aún no registrada"}</td><td>{item.voucherUrl ? <a className="row-action row-action-icon" href={item.voucherUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver comprobante de ${item.concept} de ${item.program}`} title="Ver comprobante"><Eye size={17} aria-hidden="true" /></a> : <span className="investor-payment-unavailable">No disponible</span>}</td></tr>)}</tbody></table></div> : <EmptyState icon={Clock3} title="Sin pagos registrados" description="Los pagos administrados y sus soportes aparecerán aquí." />}
    </section>
  </>;
}
