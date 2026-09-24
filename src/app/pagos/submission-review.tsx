"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Eye, LoaderCircle, X, XCircle } from "lucide-react";
import { approveSubmissionAction, rejectSubmissionAction, type PaymentActionState } from "./actions";

const initialState: PaymentActionState = { success: false, message: "" };

function ApproveSubmissionDialog({ id, saleCode, amount, voucherUrl, onClose, onDone }: { id: string; saleCode: string; amount: string; voucherUrl: string; onClose: () => void; onDone: () => void }) {
  const [state, action, pending] = useActionState(approveSubmissionAction.bind(null, id), initialState);
  const referenceRef = useRef<HTMLInputElement>(null);

  useEffect(() => { referenceRef.current?.focus(); }, []);
  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }}>
    <section className="member-dialog payment-approval-dialog" role="dialog" aria-modal="true" aria-labelledby={`approve-submission-${id}`} aria-describedby={`approve-submission-description-${id}`}>
      <div className="dialog-header"><div><span className="eyebrow">Validación de pago</span><h2 id={`approve-submission-${id}`}>Aprobar comprobante</h2><p id={`approve-submission-description-${id}`}>Venta {saleCode} · {amount}. Verifica el soporte y registra los datos del pago.</p></div><button type="button" className="icon-button" aria-label="Cerrar" disabled={pending} onClick={onClose}><X size={18} /></button></div>
      <form action={action} className="member-form">
        <a className="row-action payment-approval-voucher" href={voucherUrl} target="_blank" rel="noreferrer"><Eye size={17} aria-hidden="true" />Ver comprobante</a>
        <div className="form-grid payment-approval-fields">
          <label><span>Número de comprobante / referencia *</span><input ref={referenceRef} name="reference" maxLength={60} minLength={3} placeholder="Operación bancaria o recibo" required /><small className="password-hint">Se guardará como referencia única del pago.</small>{state.errors?.reference?.[0] && <small className="field-error">{state.errors.reference[0]}</small>}</label>
          <label><span>Fecha de pago *</span><input name="paidAt" type="date" required /><small className="password-hint">Usa la fecha indicada en el comprobante.</small>{state.errors?.paidAt?.[0] && <small className="field-error">{state.errors.paidAt[0]}</small>}</label>
        </div>
        {state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}
        <div className="dialog-actions"><button type="button" className="cancel-button" disabled={pending} onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} aria-hidden="true" /> : <BadgeCheck size={17} aria-hidden="true" />}{pending ? "Aprobando..." : "Confirmar y aplicar pago"}</button></div>
      </form>
    </section>
  </div>;
}

function RejectSubmissionDialog({ id, saleCode, onClose, onDone }: { id: string; saleCode: string; onClose: () => void; onDone: () => void }) {
  const [state, action, pending] = useActionState(rejectSubmissionAction.bind(null, id), initialState);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { reasonRef.current?.focus(); }, []);
  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }}>
    <section className="member-dialog payment-rejection-dialog" role="dialog" aria-modal="true" aria-labelledby={`reject-submission-${id}`} aria-describedby={`reject-submission-description-${id}`}>
      <div className="dialog-header"><div><span className="eyebrow">Revisión de comprobante</span><h2 id={`reject-submission-${id}`}>Rechazar comprobante</h2><p id={`reject-submission-description-${id}`}>Venta {saleCode}. Escribe el motivo antes de confirmar.</p></div><button type="button" className="icon-button" aria-label="Cerrar" disabled={pending} onClick={onClose}><X size={18} /></button></div>
      <form action={action} className="member-form">
        <label className="payment-rejection-field" htmlFor={`reject-reason-${id}`}><span>Motivo del rechazo *</span><textarea ref={reasonRef} id={`reject-reason-${id}`} name="reason" required minLength={5} maxLength={500} rows={4} placeholder="Explica qué debe corregir el socio para volver a enviar el comprobante" /></label>
        <small className="password-hint">Mínimo 5 caracteres. El motivo quedará registrado para seguimiento.</small>
        {state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}
        <div className="dialog-actions"><button type="button" className="cancel-button" disabled={pending} onClick={onClose}>Cancelar</button><button type="submit" className="row-action danger-link payment-rejection-confirm" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} aria-hidden="true" /> : <XCircle size={17} aria-hidden="true" />}{pending ? "Rechazando..." : "Confirmar rechazo"}</button></div>
      </form>
    </section>
  </div>;
}

export function SubmissionReview({ id, saleCode, amount, voucherUrl }: { id: string; saleCode: string; amount: string; voucherUrl: string }) {
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const closeDialog = () => { const button = mode === "approve" ? approveButtonRef : rejectButtonRef; setMode(null); requestAnimationFrame(() => button.current?.focus()); };
  const finishReview = () => { setMode(null); router.refresh(); };

  return <div className="submission-review">
    <div className="row-actions submission-review-actions"><button ref={approveButtonRef} className="row-action row-action-icon approve" type="button" aria-label={`Aprobar comprobante de la venta ${saleCode}`} title="Aprobar comprobante" onClick={() => setMode("approve")}><BadgeCheck size={17} aria-hidden="true" /></button><button ref={rejectButtonRef} className="row-action row-action-icon danger-link" type="button" aria-label={`Rechazar comprobante de la venta ${saleCode}`} title="Rechazar comprobante" onClick={() => setMode("reject")}><XCircle size={17} aria-hidden="true" /></button></div>
    {mode === "approve" && <ApproveSubmissionDialog id={id} saleCode={saleCode} amount={amount} voucherUrl={voucherUrl} onClose={closeDialog} onDone={finishReview} />}
    {mode === "reject" && <RejectSubmissionDialog id={id} saleCode={saleCode} onClose={closeDialog} onDone={finishReview} />}
  </div>;
}
