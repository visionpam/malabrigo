"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, Paperclip, Send } from "lucide-react";
import { addPqrsMessageAction, changePqrsStatusAction, createPqrsAction, type PqrsActionState } from "./actions";

const initial: PqrsActionState = { success: false, message: "" };

export function NewPqrsForm() {
  const [state, action, pending] = useActionState(createPqrsAction, initial);
  if (state.success) return <div className="pqrs-success" role="status"><strong>{state.message}</strong><Link className="secondary-button" href={`/pqrs/${state.caseId}`}>Ver seguimiento</Link></div>;
  return <form action={action} className="pqrs-form">
    <label>Tipo de solicitud <select name="category" required defaultValue=""><option value="" disabled>Selecciona una opción</option><option value="PETITION">Petición</option><option value="COMPLAINT">Queja</option><option value="CLAIM">Reclamo</option><option value="SUGGESTION">Sugerencia</option></select></label>
    <label>Asunto <input name="subject" minLength={5} maxLength={180} required placeholder="Resume el motivo de tu solicitud" /></label>
    <label>Descripción <textarea name="body" minLength={10} maxLength={5000} required rows={6} placeholder="Cuéntanos qué ocurrió y qué respuesta esperas" /></label>
    <label>Adjunto (opcional) <input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" /><small>JPG, PNG o PDF, máximo 8 MB.</small></label>
    {state.message && <p className="form-message error" role="alert">{state.message}</p>}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Send size={17} aria-hidden="true" />}{pending ? "Radicando..." : "Radicar solicitud"}</button>
  </form>;
}

export function PqrsMessageForm({ caseId, staff }: { caseId: string; staff: boolean }) {
  const [state, action, pending] = useActionState(addPqrsMessageAction.bind(null, caseId), initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state.success]);
  return <form ref={formRef} action={action} className="pqrs-form pqrs-reply-form">
    <label>{staff ? "Respuesta al usuario" : "Agregar mensaje"}<textarea name="body" minLength={10} maxLength={5000} required rows={4} placeholder={staff ? "Escribe una respuesta clara para el usuario" : "Escribe información adicional"} /></label>
    <label className="pqrs-file-label"><Paperclip size={16} aria-hidden="true" /> Adjuntar archivo (opcional)<input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" /><small>JPG, PNG o PDF, máximo 8 MB.</small></label>
    {state.message && <p className={`form-message ${state.success ? "success" : "error"}`} role="status">{state.message}</p>}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Send size={17} aria-hidden="true" />}{pending ? "Enviando..." : staff ? "Responder" : "Enviar mensaje"}</button>
  </form>;
}

export function PqrsStatusButton({ caseId, next, label }: { caseId: string; next: "IN_REVIEW" | "CLOSED"; label: string }) {
  const [state, action, pending] = useActionState(changePqrsStatusAction.bind(null, caseId, next), initial);
  return <form action={action} className="pqrs-status-form"><button className="secondary-button" type="submit" disabled={pending}>{pending ? "Guardando..." : label}</button>{state.message && <span role="status">{state.message}</span>}</form>;
}
