"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserRoundPlus, X } from "lucide-react";

import { createMemberAction, type CreateMemberState } from "./actions";

const initialState: CreateMemberState = { success: false, message: "" };

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null;
}

function MemberCreateForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [state, formAction, pending] = useActionState(createMemberAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onCreated();
    }
  }, [onCreated, router, state.success]);

  return <form action={formAction} className="member-form">
    <div className="form-grid">
      <label><span>Tipo de documento *</span><select name="documentType" defaultValue="DNI" required><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option><option value="RUC">RUC</option></select><FieldError messages={state.errors?.documentType} /></label>
      <label><span>Número de documento *</span><input name="documentNumber" autoComplete="off" maxLength={20} required placeholder="Ej. 12345678" /><FieldError messages={state.errors?.documentNumber} /></label>
      <label><span>Nombres *</span><input name="firstName" autoComplete="given-name" maxLength={100} required placeholder="Nombres del socio" /><FieldError messages={state.errors?.firstName} /></label>
      <label><span>Apellidos *</span><input name="lastName" autoComplete="family-name" maxLength={100} required placeholder="Apellidos del socio" /><FieldError messages={state.errors?.lastName} /></label>
      <label><span>País *</span><select name="countryCode" defaultValue="PE" required><option value="PE">Perú</option><option value="CO">Colombia</option><option value="EC">Ecuador</option><option value="CL">Chile</option><option value="US">Estados Unidos</option></select><FieldError messages={state.errors?.countryCode} /></label>
      <label><span>Teléfono</span><input name="phone" autoComplete="tel" maxLength={30} placeholder="+51 999 999 999" /><FieldError messages={state.errors?.phone} /></label>
      <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" autoComplete="email" maxLength={255} required placeholder="socio@correo.com" /><FieldError messages={state.errors?.email} /></label>
    </div>
    {state.message && !state.success && <p className="form-message error" aria-live="polite">{state.message}</p>}
    <div className="dialog-actions"><button type="button" className="cancel-button" disabled={pending} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <UserRoundPlus size={17} />}{pending ? "Guardando..." : "Crear socio"}</button></div>
  </form>;
}

export function MemberCreateDialog() {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);

  return <>
    <button className="primary-button" onClick={() => { setCreated(false); setOpen(true); }}><UserRoundPlus size={17} /> Registrar socio</button>
    {created && <span className="toast-message" role="status">Socio registrado correctamente.</span>}
    {open && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
        <div className="dialog-header"><div><span className="eyebrow">Nuevo expediente</span><h2 id="member-dialog-title">Registrar socio</h2><p>Ingresa los datos de identificación y contacto.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <MemberCreateForm onCancel={() => setOpen(false)} onCreated={() => { setOpen(false); setCreated(true); }} />
      </section>
    </div>}
  </>;
}
