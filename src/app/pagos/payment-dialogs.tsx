"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, FileUp, LoaderCircle, Pencil, ReceiptText, Save, Upload, X } from "lucide-react";
import { paymentConceptOptions } from "@/lib/payment-concepts";
import { attachPaymentVoucherAction, createPaymentAction, type PaymentActionState, updatePaymentAction, voidPaymentAction } from "./actions";

type SaleOption = { id: string; code: string; member: string; program: string; mode: "CASH" | "CREDIT"; status: string };
type PaymentData = { id: string; saleId: string; reference: string; amount: number; concept: "SEPARATION" | "DOWN_PAYMENT" | "INSTALLMENT" | "OTHER"; paidAt: string; status: "CONFIRMED" | "VOIDED"; history: { id: string; action: string; createdAt: string }[] };
const initialState: PaymentActionState = { success: false, message: "" };
const actionLabels: Record<string, string> = { PAYMENT_CREATED: "Pago registrado", PAYMENT_UPDATED: "Pago editado", PAYMENT_VOIDED: "Pago anulado" };
const today = new Date().toISOString().slice(0, 10);

function FieldError({ messages }: { messages?: string[] }) { return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null; }

function PaymentForm({ sales, payment, onDone }: { sales: SaleOption[]; payment?: PaymentData; onDone: (message?: string) => void }) {
  const action = payment ? updatePaymentAction.bind(null, payment.id) : createPaymentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) { router.refresh(); onDone(state.message); } }, [onDone, router, state.message, state.success]);
  return <form action={formAction} className="member-form">
    <div className="form-grid">
      <label className="form-wide"><span>Venta *</span><select name="saleId" defaultValue={payment?.saleId ?? sales[0]?.id} required disabled={Boolean(payment)}>{sales.map((sale) => <option key={sale.id} value={sale.id}>{sale.code} · {sale.member} · {sale.program}</option>)}</select>{payment && <input type="hidden" name="saleId" value={payment.saleId} />}<FieldError messages={state.errors?.saleId} /></label>
      <label><span>Concepto *</span><select name="concept" defaultValue={payment?.concept ?? "INSTALLMENT"} required>{paymentConceptOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError messages={state.errors?.concept} /></label>
      <label><span>Monto USD *</span><input name="amount" type="number" min="0.01" step="0.01" defaultValue={payment?.amount} placeholder="0.00" required /><FieldError messages={state.errors?.amount} /></label>
      <label><span>Referencia *</span><input name="reference" defaultValue={payment?.reference} maxLength={60} placeholder="Operación bancaria o recibo" required /><FieldError messages={state.errors?.reference} /></label>
      <label><span>Fecha de pago *</span><input name="paidAt" type="date" defaultValue={payment?.paidAt ?? today} required /><FieldError messages={state.errors?.paidAt} /></label>
      {!payment && <label className="form-wide"><span>Soporte de pago *</span><input name="voucher" type="file" accept=".jpg,.jpeg,.png,.pdf" required /><small className="password-hint">Adjunta el comprobante en JPG, PNG o PDF (máximo 8 MB). Quedará aprobado y vinculado a este pago.</small></label>}
    </div>
    {state.message && !state.success && <p className="form-message error">{state.message}</p>}
    {payment?.history.length ? <section className="history-block"><h3><ReceiptText size={14} /> Historial del pago</h3>{payment.history.map((item) => <div key={item.id}><span>{actionLabels[item.action] ?? item.action}</span><time>{item.createdAt}</time></div>)}</section> : null}
    <div className="dialog-actions"><button type="button" className="cancel-button" onClick={() => onDone()}>Cancelar</button><button type="submit" className="primary-button" disabled={pending || sales.length === 0}>{pending ? <LoaderCircle className="spinner" size={17} /> : payment ? <Save size={17} /> : <FileUp size={17} />}{pending ? "Guardando..." : payment ? "Guardar cambios" : "Registrar pago"}</button></div>
  </form>;
}

function VoidForm({ payment, onDone }: { payment: PaymentData; onDone: (message?: string) => void }) {
  const [state, formAction, pending] = useActionState(voidPaymentAction.bind(null, payment.id), initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) { router.refresh(); onDone(state.message); } }, [onDone, router, state.message, state.success]);
  return <form action={formAction} className="void-form"><div className="warning-box"><Ban size={20} /><span><strong>Esta acción no elimina el movimiento</strong><small>El pago quedará marcado como anulado, se retirarán sus aplicaciones a cuotas y se recalcularán los estados relacionados.</small></span></div><label><span>Motivo de anulación *</span><textarea name="reason" maxLength={300} placeholder="Explica por qué se anula este pago" required /></label>{state.message && !state.success && <p className="form-message error">{state.message}</p>}<div className="dialog-actions"><button type="button" className="cancel-button" onClick={() => onDone()}>Cancelar</button><button type="submit" className="danger-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Ban size={17} />}{pending ? "Anulando..." : "Confirmar anulación"}</button></div></form>;
}

export function PaymentCreateDialog({ sales }: { sales: SaleOption[] }) {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  return <><button className="primary-button" onClick={() => { setMessage(""); setOpen(true); }}><Upload size={17} /> Registrar pago</button>{message && <span className="toast-message">{message}</span>}{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-create-title"><div className="dialog-header"><div><span className="eyebrow">Movimiento financiero</span><h2 id="payment-create-title">Registrar pago</h2><p>Registra un ingreso confirmado y su concepto contable.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>{sales.length ? <PaymentForm sales={sales} onDone={(text) => { setOpen(false); if (text) setMessage(text); }} /> : <div className="member-form"><p className="form-message error">No existen ventas disponibles para recibir pagos.</p></div>}</section></div>}</>;
}

export function PaymentVoucherAttach({ paymentId, reference }: { paymentId: string; reference: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(attachPaymentVoucherAction.bind(null, paymentId), initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  return <><button type="button" className="row-action row-action-icon" aria-label={`Adjuntar soporte al pago ${reference}`} title="Adjuntar soporte" onClick={() => setOpen(true)}><FileUp size={17} aria-hidden="true" /></button>{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby={`voucher-${paymentId}`}><div className="dialog-header"><div><span className="eyebrow">Soporte de pago</span><h2 id={`voucher-${paymentId}`}>Adjuntar comprobante</h2><p>Pago {reference}. El archivo quedará asociado a este movimiento.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><form action={action} className="member-form"><div className="form-grid"><label className="form-wide"><span>Comprobante *</span><input name="voucher" type="file" accept=".jpg,.jpeg,.png,.pdf" required /><small className="password-hint">JPG, PNG o PDF de máximo 8 MB.</small></label></div>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`} role="status">{state.message}</p>}<div className="dialog-actions"><button type="button" className="cancel-button" onClick={() => setOpen(false)}>Cerrar</button><button type="submit" className="primary-button" disabled={pending || state.success}>{pending ? <LoaderCircle className="spinner" size={17} /> : <FileUp size={17} />}{pending ? "Guardando..." : "Adjuntar soporte"}</button></div></form></section></div>}</>;
}

export function PaymentManageDialog({ sales, payment }: { sales: SaleOption[]; payment: PaymentData }) {
  const [mode, setMode] = useState<"edit" | "void" | null>(null); const [message, setMessage] = useState("");
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  return <><div className="row-actions"><button type="button" className="row-action row-action-icon edit-link" aria-label={`Editar pago ${payment.reference}`} title="Editar pago" disabled={payment.status === "VOIDED"} onClick={() => setMode("edit")}><Pencil size={17} aria-hidden="true" /></button><button type="button" className="row-action row-action-icon danger-link" aria-label={`Anular pago ${payment.reference}`} title="Anular pago" disabled={payment.status === "VOIDED"} onClick={() => setMode("void")}><Ban size={17} aria-hidden="true" /></button></div>{message && <span className="toast-message">{message}</span>}{mode && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMode(null); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby={`payment-${payment.id}`}><div className="dialog-header"><div><span className="eyebrow">{mode === "edit" ? "Corrección contable" : "Reversión contable"}</span><h2 id={`payment-${payment.id}`}>{mode === "edit" ? "Editar pago" : "Anular pago"}</h2><p>{payment.reference} · USD {payment.amount.toLocaleString("es-PE")}</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setMode(null)}><X size={18} /></button></div>{mode === "edit" ? <PaymentForm sales={sales} payment={payment} onDone={(text) => { setMode(null); if (text) setMessage(text); }} /> : <VoidForm payment={payment} onDone={(text) => { setMode(null); if (text) setMessage(text); }} />}</section></div>}</>;
}
