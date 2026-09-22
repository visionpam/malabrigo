"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LoaderCircle, Mail, Pencil, Save, X } from "lucide-react";
import { memberStatusLabel } from "@/lib/format";
import { resendInvitationAction, type CreateMemberState, updateMemberAction } from "./actions";
import { CountryAutocomplete, type CountryOption } from "@/components/country-autocomplete";
import { AddressFields, type AddressOption } from "@/components/address-fields";
import { MemberRowActions } from "./member-row-actions";

type HistoryItem = { id: string; action: string; createdAt: string };
type AmbassadorOption = { id: string; name: string; code: string };
type MemberData = { id: string; memberCode: string; documentType: string; documentNumber: string; firstName: string; lastName: string; countryCode: string; regionCode?: string | null; provinceCode?: string | null; districtCode?: string | null; phone: string; email: string; residence?: string; occupation?: string; maritalStatus?: string; profileType: "INVESTOR" | "AMBASSADOR" | "BOTH"; userStatus: string | null; status: keyof typeof memberStatusLabel; joinedAt: string | null; history: HistoryItem[] };
const initialState: CreateMemberState = { success: false, message: "" };
const actionLabels: Record<string, string> = { MEMBER_CREATED: "Socio registrado", MEMBER_UPDATED: "Datos actualizados", MEMBER_ACTIVATED: "Socio activado" };

function FieldError({ messages }: { messages?: string[] }) { return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null; }

function InvitationButton({ memberId }: { memberId: string }) {
  const action = resendInvitationAction.bind(null, memberId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return <span className="invitation-form"><button type="submit" formAction={formAction} className="row-action" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={13} /> : <Mail size={13} />}{pending ? "Enviando..." : "Reenviar invitación"}</button>{state.message && <small className={state.success ? "success-text" : "field-error"}>{state.message}</small>}</span>;
}

function EditForm({ member, ambassadors, countries, documentTypes, occupations, maritalStatuses, regions, provinces, districts, onDone }: { member: MemberData; ambassadors: AmbassadorOption[]; countries: CountryOption[]; documentTypes: CountryOption[]; occupations: CountryOption[]; maritalStatuses: CountryOption[]; regions: AddressOption[]; provinces: AddressOption[]; districts: AddressOption[]; onDone: () => void }) {
  const action = updateMemberAction.bind(null, member.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [profileType, setProfileType] = useState(member.profileType);
  const router = useRouter();
  useEffect(() => { if (state.success) { router.refresh(); onDone(); } }, [onDone, router, state.success]);
  return <form action={formAction} className="member-form">
    <div className="record-status"><span>Código personal · Estado comercial</span><strong>{member.memberCode} · {memberStatusLabel[member.status]}</strong><small>{member.status === "PROSPECT" ? "El perfil inversionista se activará al activar una venta separada y con contrato confirmado." : member.joinedAt ? `Activo desde ${member.joinedAt}` : "Estado vigente"}</small>{member.userStatus !== "ACTIVE" && <InvitationButton memberId={member.id} />}</div>
    <div className="form-grid">
      <label><span>Tipo de documento *</span><CountryAutocomplete countries={documentTypes} defaultCode={member.documentType} name="documentType" placeholder="Buscar tipo de documento" /><FieldError messages={state.errors?.documentType} /></label>
      <label><span>Número de documento *</span><input name="documentNumber" defaultValue={member.documentNumber} maxLength={20} required /><FieldError messages={state.errors?.documentNumber} /></label>
      <label><span>Nombres *</span><input name="firstName" defaultValue={member.firstName} maxLength={100} required /><FieldError messages={state.errors?.firstName} /></label>
      <label><span>Apellidos *</span><input name="lastName" defaultValue={member.lastName} maxLength={100} required /><FieldError messages={state.errors?.lastName} /></label>
      <AddressFields countries={countries} regions={regions} provinces={provinces} districts={districts} defaultCountryCode={member.countryCode} defaultRegionCode={member.regionCode ?? undefined} defaultProvinceCode={member.provinceCode ?? undefined} defaultDistrictCode={member.districtCode ?? undefined} errors={state.errors} />
      <label className="form-wide"><span>Dirección</span><input name="residence" defaultValue={member.residence} maxLength={180} placeholder="Calle, número, ciudad" /></label>
      <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" defaultValue={member.email} maxLength={255} required /><FieldError messages={state.errors?.email} /></label>
      <label><span>Ocupación</span><CountryAutocomplete countries={occupations} defaultCode={member.occupation} name="occupation" placeholder="Buscar ocupación" /></label>
      <label><span>Estado civil</span><CountryAutocomplete countries={maritalStatuses} defaultCode={member.maritalStatus ?? ""} name="maritalStatus" placeholder="Buscar estado civil" /></label>
      <label><span>Teléfono con indicativo</span><input name="phone" defaultValue={member.phone} maxLength={30} placeholder="+51 999 999 999" /><FieldError messages={state.errors?.phone} /></label><label><span>Perfil *</span><select name="profileType" value={profileType} onChange={(event) => setProfileType(event.target.value as MemberData["profileType"])}><option value="AMBASSADOR" disabled={member.profileType === "INVESTOR" || member.profileType === "BOTH"}>Embajador</option><option value="INVESTOR" disabled={member.profileType === "AMBASSADOR" || member.profileType === "BOTH"}>Inversionista</option><option value="BOTH">Embajador e inversionista</option></select><small className="password-hint">Puedes agregar el perfil complementario; no se eliminan perfiles con historial.</small></label>
      {member.profileType !== "BOTH" && profileType === "BOTH" && member.profileType === "INVESTOR" ? <label><span>Embajador patrocinador</span><select name="sponsorId" defaultValue=""><option value="">Sin patrocinador</option>{ambassadors.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label> : <input type="hidden" name="sponsorId" value="" />}
    </div>
    {state.message && !state.success && <p className="form-message error">{state.message}</p>}
    <div className="history-block"><h3><Clock3 size={14} /> Historial</h3>{member.history.length ? member.history.map((item) => <div key={item.id}><span>{actionLabels[item.action] ?? item.action}</span><time>{item.createdAt}</time></div>) : <p>Sin movimientos registrados.</p>}</div>
    <div className="dialog-actions"><button type="button" className="cancel-button" onClick={onDone}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar cambios"}</button></div>
  </form>;
}

export function MemberManageDialog({ member, ambassadors, countries, documentTypes, occupations, maritalStatuses, regions = [], provinces = [], districts = [] }: { member: MemberData; ambassadors: AmbassadorOption[]; countries: CountryOption[]; documentTypes: CountryOption[]; occupations: CountryOption[]; maritalStatuses: CountryOption[]; regions?: AddressOption[]; provinces?: AddressOption[]; districts?: AddressOption[] }) {
  const [open, setOpen] = useState(false);
  const rowActions = <MemberRowActions memberId={member.id} blocked={member.userStatus === "SUSPENDED"} deletable={member.history.length <= 1} />;
  void rowActions;
  return <>{rowActions}<button className="row-action" onClick={() => setOpen(true)}><Pencil size={13} /> Editar</button>{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby={`member-${member.id}`}><div className="dialog-header"><div><span className="eyebrow">Expediente del socio</span><h2 id={`member-${member.id}`}>{member.firstName} {member.lastName}</h2><p>Edita sus datos y consulta la trazabilidad del expediente.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><EditForm member={member} ambassadors={ambassadors} countries={countries} documentTypes={documentTypes} occupations={occupations} maritalStatuses={maritalStatuses} regions={regions} provinces={provinces} districts={districts} onDone={() => setOpen(false)} /></section></div>}</>;
}
