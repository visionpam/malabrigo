"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock3, Eye, LoaderCircle, ReceiptText, X } from "lucide-react";
import { formatMoney, saleStatusLabel } from "@/lib/format";
import { activateSaleAction, confirmSeparationAction, type SaleOperationState } from "./actions";

type HistoryItem = { id: string; action: string; createdAt: string };
type InstallmentItem = { number: number; amount: number; dueDate: string; status: string };
type SaleData = { id: string; code: string; member: string; program: string; mode: "CASH" | "CREDIT"; termMonths: number | null; status: keyof typeof saleStatusLabel; totalPrice: number; separationAmount: number; downPaymentAmount: number; confirmedPayments: number; signedAt: string | null; installments: InstallmentItem[]; history: HistoryItem[] };
const initialState: SaleOperationState = { success: false, message: "" };
const actionLabels: Record<string, string> = { SALE_CREATED: "Venta creada como borrador", SEPARATION_CONFIRMED: "Separación confirmada", SALE_ACTIVATED: "Venta y socio activados" };

function SaleOperations({ sale }: { sale: SaleData }) {
  const [separationState, separationAction, separationPending] = useActionState(confirmSeparationAction.bind(null, sale.id), initialState);
  const [activationState, activationAction, activationPending] = useActionState(activateSaleAction.bind(null, sale.id), initialState);
  const router = useRouter();
  useEffect(() => { if (separationState.success || activationState.success) router.refresh(); }, [activationState.success, router, separationState.success]);
  const separationCovered = sale.confirmedPayments >= sale.separationAmount;

  return <>
    <section className="detail-grid"><div><span>Socio</span><strong>{sale.member}</strong></div><div><span>Programa</span><strong>{sale.program}</strong></div><div><span>Modalidad</span><strong>{sale.mode === "CASH" ? "Contado" : `${sale.termMonths} meses`}</strong></div><div><span>Estado</span><strong>{saleStatusLabel[sale.status]}</strong></div><div><span>Valor</span><strong>{formatMoney(sale.totalPrice)}</strong></div><div><span>Separación</span><strong>{formatMoney(sale.separationAmount)}</strong></div>{sale.mode === "CREDIT" && <div><span>Cuota inicial</span><strong>{formatMoney(sale.downPaymentAmount)}</strong></div>}<div><span>Pagos confirmados</span><strong>{formatMoney(sale.confirmedPayments)}</strong></div></section>

    {sale.status === "DRAFT" && <form action={separationAction} className="operation-card"><div><ReceiptText size={18} /><span><strong>1. Confirmar separación</strong><small>Registra el pago exacto de {formatMoney(sale.separationAmount)} y mueve la venta a Separada.</small></span></div><label><span>Referencia bancaria o de caja *</span><input name="reference" maxLength={60} placeholder="Ej. OP-123456" required /></label>{separationState.message && <p className={`form-message ${separationState.success ? "success" : "error"}`}>{separationState.message}</p>}<button className="primary-button" disabled={separationPending}>{separationPending ? <LoaderCircle className="spinner" size={16} /> : <ReceiptText size={16} />}Confirmar separación</button></form>}

    {sale.status === "RESERVED" && <form action={activationAction} className="operation-card"><div><BadgeCheck size={18} /><span><strong>2. Activar venta y socio</strong><small>La separación está cubierta. Confirma la firma para iniciar la vigencia.</small></span></div><label className="check-field"><input type="checkbox" name="contractConfirmed" required /><span>Confirmo que el contrato fue revisado y firmado.</span></label>{activationState.message && <p className={`form-message ${activationState.success ? "success" : "error"}`}>{activationState.message}</p>}<button className="primary-button" disabled={activationPending || !separationCovered}>{activationPending ? <LoaderCircle className="spinner" size={16} /> : <BadgeCheck size={16} />}Activar operación</button></form>}

    {sale.status === "ACTIVE" && <div className="operation-card complete"><BadgeCheck size={20} /><span><strong>Operación activa</strong><small>{sale.signedAt ? `Contrato confirmado el ${sale.signedAt}.` : "Contrato confirmado."} El socio ya tiene un programa vigente.</small></span></div>}

    {sale.installments.length > 0 && <section className="history-block"><h3><ReceiptText size={14} /> Cronograma de cuotas</h3>{sale.installments.map((item) => <div key={item.number}><span>Cuota {item.number} · {formatMoney(item.amount)}</span><time>{item.dueDate} · {item.status === "PENDING" ? "Pendiente" : item.status}</time></div>)}</section>}
    <section className="history-block"><h3><Clock3 size={14} /> Historial de la venta</h3>{sale.history.map((item) => <div key={item.id}><span>{actionLabels[item.action] ?? item.action}</span><time>{item.createdAt}</time></div>)}</section>
  </>;
}

export function SaleManageDialog({ sale }: { sale: SaleData }) {
  const [open, setOpen] = useState(false);
  return <><button className="row-action" onClick={() => setOpen(true)}><Eye size={13} /> Ver detalle</button>{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog sale-detail-dialog" role="dialog" aria-modal="true" aria-labelledby={`sale-${sale.id}`}><div className="dialog-header"><div><span className="eyebrow">Detalle de operación</span><h2 id={`sale-${sale.id}`}>{sale.code}</h2><p>Seguimiento comercial, financiero y trazabilidad.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="member-form"><SaleOperations sale={sale} /><div className="dialog-actions"><button type="button" className="cancel-button" onClick={() => setOpen(false)}>Cerrar</button></div></div></section></div>}</>;
}
