"use client";

import { useActionState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { paymentConceptOptions } from "@/lib/payment-concepts";
import { submitOwnPaymentAction, type SubmissionState } from "./actions";

const initialState: SubmissionState = { success: false, message: "" };

export function PaymentSubmissionForm({ sales }: { sales: { id: string; code: string; program: string }[] }) {
  const [state, action, pending] = useActionState(submitOwnPaymentAction, initialState);
  return <form action={action} className="member-form submission-form"><div className="form-grid">
    <label className="form-wide"><span>Inversión *</span><select name="saleId" required defaultValue={sales[0]?.id}>{sales.map((sale) => <option key={sale.id} value={sale.id}>{sale.code} · {sale.program}</option>)}</select></label>
    <label><span>Concepto *</span><select name="concept" defaultValue="INSTALLMENT" required>{paymentConceptOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label><span>Monto pagado *</span><input name="amount" type="number" min="0.01" step="0.01" required /></label>
    <label className="form-wide"><span>Comprobante *</span><input name="voucher" type="file" accept="image/jpeg,image/png,application/pdf" required /><small className="password-hint">JPG, PNG o PDF. Máximo 8 MB.</small></label>
  </div>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<div className="dialog-actions"><button className="primary-button" type="submit" disabled={pending || sales.length === 0}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Upload size={17} />}{pending ? "Enviando..." : "Enviar comprobante"}</button></div></form>;
}
