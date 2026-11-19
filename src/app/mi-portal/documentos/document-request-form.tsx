"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { createPqrsAction, type PqrsActionState } from "@/app/pqrs/actions";

const initialState: PqrsActionState = { success: false, message: "" };

export function DocumentRequestForm() {
  const [state, action, pending] = useActionState(createPqrsAction, initialState);
  if (state.success) return <div className="pqrs-success" role="status"><strong>{state.message}</strong><Link className="secondary-button" href={`/pqrs/${state.caseId}`}>Ver conversación</Link></div>;

  return <form action={action} className="pqrs-form">
    <input type="hidden" name="category" value="DOCUMENT_REQUEST" />
    <label>Documento que necesitas <input name="subject" minLength={5} maxLength={180} required placeholder="Ej. Copia del contrato de participación" /></label>
    <label>Cuéntanos qué necesitas <textarea name="body" minLength={10} maxLength={5000} required rows={4} placeholder="Indica el documento, la inversión relacionada y cualquier dato que ayude a encontrarlo." /></label>
    <label>Archivo de referencia (opcional) <input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" /><small>JPG, PNG o PDF, máximo 8 MB.</small></label>
    {state.message && <p className="form-message error" role="alert">{state.message}</p>}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Send size={17} aria-hidden="true" />}{pending ? "Enviando..." : "Enviar solicitud"}</button>
  </form>;
}
