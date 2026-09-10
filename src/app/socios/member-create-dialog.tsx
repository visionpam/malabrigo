"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserRoundPlus, X } from "lucide-react";

import { createMemberAction, type CreateMemberState } from "./actions";

const initialState: CreateMemberState = { success: false, message: "" };

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null;
}

type AmbassadorOption = { id: string; name: string; code: string };

function MemberCreateForm({ ambassadors, networkMode, onCancel, onCreated }: { ambassadors: AmbassadorOption[]; networkMode: boolean; onCancel: () => void; onCreated: (code: string, sent: boolean, message: string) => void }) {
  const [state, formAction, pending] = useActionState(createMemberAction, initialState);
  const [profileType, setProfileType] = useState("INVESTOR");
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onCreated(state.memberCode ?? "", Boolean(state.invitationSent), state.message);
    }
  }, [onCreated, router, state.invitationSent, state.memberCode, state.message, state.success]);

  return <form action={formAction} className="member-form">
    <div className="form-grid">
      <label><span>Tipo de documento *</span><select name="documentType" defaultValue="DNI" required><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option><option value="RUC">RUC</option></select><FieldError messages={state.errors?.documentType} /></label>
      <label><span>Número de documento *</span><input name="documentNumber" autoComplete="off" maxLength={20} required placeholder="Ej. 12345678" /><FieldError messages={state.errors?.documentNumber} /></label>
      <label><span>Nombres *</span><input name="firstName" autoComplete="given-name" maxLength={100} required placeholder="Nombres del socio" /><FieldError messages={state.errors?.firstName} /></label>
      <label><span>Apellidos *</span><input name="lastName" autoComplete="family-name" maxLength={100} required placeholder="Apellidos del socio" /><FieldError messages={state.errors?.lastName} /></label>
      <label><span>País *</span><select name="countryCode" defaultValue="PE" required><option value="PE">Perú</option><option value="CO">Colombia</option><option value="EC">Ecuador</option><option value="CL">Chile</option><option value="US">Estados Unidos</option></select><FieldError messages={state.errors?.countryCode} /></label>
      <label><span>Teléfono</span><input name="phone" autoComplete="tel" maxLength={30} placeholder="+51 999 999 999" /><FieldError messages={state.errors?.phone} /></label>
      <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" autoComplete="email" maxLength={255} required placeholder="socio@correo.com" /><FieldError messages={state.errors?.email} /></label>
      <label><span>Residencia</span><input name="residence" maxLength={180} placeholder="Ciudad y dirección" /><FieldError messages={state.errors?.residence} /></label>
      <label><span>Ocupación</span><input name="occupation" maxLength={140} placeholder="Ocupación o profesión" /><FieldError messages={state.errors?.occupation} /></label>
      <label><span>Estado civil</span><select name="maritalStatus" defaultValue=""><option value="">No especificado</option><option value="SINGLE">Soltero/a</option><option value="MARRIED">Casado/a</option><option value="COHABITING">Conviviente</option><option value="DIVORCED">Divorciado/a</option><option value="WIDOWED">Viudo/a</option><option value="OTHER">Otro</option></select></label>
      {networkMode ? <><input type="hidden" name="profileType" value="INVESTOR" /><input type="hidden" name="sponsorId" value="" /></> : <><label><span>Perfil *</span><select name="profileType" value={profileType} onChange={(event) => setProfileType(event.target.value)} required><option value="INVESTOR">Inversionista</option><option value="AMBASSADOR">Embajador</option><option value="BOTH">Embajador e inversionista</option></select><FieldError messages={state.errors?.profileType} /></label><label className="form-wide"><span>Embajador patrocinador</span><select name="sponsorId" defaultValue=""><option value="">Sin patrocinador</option>{ambassadors.map((item) => <option key={item.id} value={item.id}>{item.name} · Código {item.code}</option>)}</select><FieldError messages={state.errors?.sponsorId} /><small className="password-hint">Define quién incorporó a esta persona a la red, sin importar sus perfiles.</small></label></>}
    </div>
    {state.message && !state.success && <p className="form-message error" aria-live="polite">{state.message}</p>}
    <div className="dialog-actions"><button type="button" className="cancel-button" disabled={pending} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <UserRoundPlus size={17} />}{pending ? "Guardando..." : "Crear socio"}</button></div>
  </form>;
}

export function MemberCreateDialog({ ambassadors, networkMode = false }: { ambassadors: AmbassadorOption[]; networkMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ code: string; sent: boolean; message: string } | null>(null);

  return <>
    <button className="primary-button" onClick={() => { setCreated(null); setOpen(true); }}><UserRoundPlus size={17} /> {networkMode ? "Registrar socio en mi red" : "Registrar persona"}</button>
    {created && <span className="toast-message" role="status">Código {created.code}. {created.message}</span>}
    {open && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
        <div className="dialog-header"><div><span className="eyebrow">Nueva identidad</span><h2 id="member-dialog-title">Registrar persona</h2><p>El sistema asignará un código único y enviará la invitación de acceso.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <MemberCreateForm ambassadors={ambassadors} networkMode={networkMode} onCancel={() => setOpen(false)} onCreated={(code, sent, message) => { setOpen(false); setCreated({ code, sent, message }); }} />
      </section>
    </div>}
  </>;
}
