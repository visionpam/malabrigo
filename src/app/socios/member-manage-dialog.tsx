"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LoaderCircle, Pencil, Save, X } from "lucide-react";
import { memberStatusLabel } from "@/lib/format";
import { type CreateMemberState, updateMemberAction } from "./actions";

type HistoryItem = { id: string; action: string; createdAt: string };
type MemberData = { id: string; documentType: string; documentNumber: string; firstName: string; lastName: string; countryCode: string; phone: string; email: string; status: keyof typeof memberStatusLabel; joinedAt: string | null; history: HistoryItem[] };
const initialState: CreateMemberState = { success: false, message: "" };
const actionLabels: Record<string, string> = { MEMBER_CREATED: "Socio registrado", MEMBER_UPDATED: "Datos actualizados", MEMBER_ACTIVATED: "Socio activado" };

function FieldError({ messages }: { messages?: string[] }) { return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null; }

function EditForm({ member, onDone }: { member: MemberData; onDone: () => void }) {
  const action = updateMemberAction.bind(null, member.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) { router.refresh(); onDone(); } }, [onDone, router, state.success]);
  return <form action={formAction} className="member-form">
    <div className="record-status"><span>Estado comercial</span><strong>{memberStatusLabel[member.status]}</strong><small>{member.status === "PROSPECT" ? "Se activará al activar una venta separada y con contrato confirmado." : member.joinedAt ? `Activo desde ${member.joinedAt}` : "Estado vigente"}</small></div>
    <div className="form-grid">
      <label><span>Tipo de documento *</span><select name="documentType" defaultValue={member.documentType} required><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option><option value="RUC">RUC</option></select><FieldError messages={state.errors?.documentType} /></label>
      <label><span>Número de documento *</span><input name="documentNumber" defaultValue={member.documentNumber} maxLength={20} required /><FieldError messages={state.errors?.documentNumber} /></label>
      <label><span>Nombres *</span><input name="firstName" defaultValue={member.firstName} maxLength={100} required /><FieldError messages={state.errors?.firstName} /></label>
      <label><span>Apellidos *</span><input name="lastName" defaultValue={member.lastName} maxLength={100} required /><FieldError messages={state.errors?.lastName} /></label>
      <label><span>País *</span><select name="countryCode" defaultValue={member.countryCode} required><option value="PE">Perú</option><option value="CO">Colombia</option><option value="EC">Ecuador</option><option value="CL">Chile</option><option value="US">Estados Unidos</option></select><FieldError messages={state.errors?.countryCode} /></label>
      <label><span>Teléfono</span><input name="phone" defaultValue={member.phone} maxLength={30} /><FieldError messages={state.errors?.phone} /></label>
      <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" defaultValue={member.email} maxLength={255} required /><FieldError messages={state.errors?.email} /></label>
    </div>
    {state.message && !state.success && <p className="form-message error">{state.message}</p>}
    <div className="history-block"><h3><Clock3 size={14} /> Historial</h3>{member.history.length ? member.history.map((item) => <div key={item.id}><span>{actionLabels[item.action] ?? item.action}</span><time>{item.createdAt}</time></div>) : <p>Sin movimientos registrados.</p>}</div>
    <div className="dialog-actions"><button type="button" className="cancel-button" onClick={onDone}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar cambios"}</button></div>
  </form>;
}

export function MemberManageDialog({ member }: { member: MemberData }) {
  const [open, setOpen] = useState(false);
  return <><button className="row-action" onClick={() => setOpen(true)}><Pencil size={13} /> Editar</button>{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby={`member-${member.id}`}><div className="dialog-header"><div><span className="eyebrow">Expediente del socio</span><h2 id={`member-${member.id}`}>{member.firstName} {member.lastName}</h2><p>Edita sus datos y consulta la trazabilidad del expediente.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><EditForm member={member} onDone={() => setOpen(false)} /></section></div>}</>;
}
