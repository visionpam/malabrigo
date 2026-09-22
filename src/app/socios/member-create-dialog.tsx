"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserRoundPlus, X } from "lucide-react";

import { createMemberAction, type CreateMemberState } from "./actions";
import { CountryAutocomplete, type CountryOption } from "@/components/country-autocomplete";
import { AddressFields, type AddressOption } from "@/components/address-fields";

const initialState: CreateMemberState = { success: false, message: "" };

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null;
}

type AmbassadorOption = { id: string; name: string; code: string };
function MemberCreateForm({ ambassadors, countries, documentTypes, occupations, maritalStatuses, regions, provinces, districts, networkMode, onCancel, onCreated }: { ambassadors: AmbassadorOption[]; countries: CountryOption[]; documentTypes: CountryOption[]; occupations: CountryOption[]; maritalStatuses: CountryOption[]; regions: AddressOption[]; provinces: AddressOption[]; districts: AddressOption[]; networkMode: boolean; onCancel: () => void; onCreated: (code: string, sent: boolean, message: string) => void }) {
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
      <label><span>Tipo de documento *</span><CountryAutocomplete countries={documentTypes} defaultCode="DNI" name="documentType" placeholder="Buscar tipo de documento" /><FieldError messages={state.errors?.documentType} /></label>
      <label><span>Número de documento *</span><input name="documentNumber" autoComplete="off" maxLength={20} required placeholder="Ej. 12345678" /><FieldError messages={state.errors?.documentNumber} /></label>
      <label><span>Nombres *</span><input name="firstName" autoComplete="given-name" maxLength={100} required placeholder="Nombres del socio" /><FieldError messages={state.errors?.firstName} /></label>
      <label><span>Apellidos *</span><input name="lastName" autoComplete="family-name" maxLength={100} required placeholder="Apellidos del socio" /><FieldError messages={state.errors?.lastName} /></label>
      <AddressFields countries={countries} regions={regions} provinces={provinces} districts={districts} errors={state.errors} />
      <label className="form-wide"><span>Dirección</span><input name="residence" maxLength={180} placeholder="Calle, número, ciudad" /><FieldError messages={state.errors?.residence} /></label>
      <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" autoComplete="email" maxLength={255} required placeholder="socio@correo.com" /><FieldError messages={state.errors?.email} /></label>
      <label><span>Ocupación</span><CountryAutocomplete countries={occupations} name="occupation" placeholder="Buscar ocupación" /><FieldError messages={state.errors?.occupation} /></label>
      <label><span>Estado civil</span><CountryAutocomplete countries={maritalStatuses} name="maritalStatus" placeholder="Buscar estado civil" /></label>
      {networkMode ? <><label><span>Teléfono con indicativo</span><input name="phone" autoComplete="tel" maxLength={30} placeholder="+51 999 999 999" /><FieldError messages={state.errors?.phone} /></label><input type="hidden" name="profileType" value="INVESTOR" /><input type="hidden" name="sponsorId" value="" /></> : <><label><span>Teléfono con indicativo</span><input name="phone" autoComplete="tel" maxLength={30} placeholder="+51 999 999 999" /><FieldError messages={state.errors?.phone} /></label><label><span>Perfil *</span><select name="profileType" value={profileType} onChange={(event) => setProfileType(event.target.value)} required><option value="AMBASSADOR">Embajador</option><option value="INVESTOR">Inversionista</option><option value="BOTH">Embajador e inversionista</option></select><FieldError messages={state.errors?.profileType} /></label><label className="form-wide"><span>Embajador patrocinador</span><select name="sponsorId" defaultValue=""><option value="">Sin patrocinador</option>{ambassadors.map((item) => <option key={item.id} value={item.id}>{item.name} · Código {item.code}</option>)}</select><FieldError messages={state.errors?.sponsorId} /><small className="password-hint">Define quién incorporó a esta persona a la red, sin importar sus perfiles.</small></label></>}
    </div>
    {state.message && !state.success && <p className="form-message error" aria-live="polite">{state.message}</p>}
    <div className="dialog-actions"><button type="button" className="cancel-button" disabled={pending} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <UserRoundPlus size={17} />}{pending ? "Guardando..." : "Crear socio"}</button></div>
  </form>;
}

export function MemberCreateDialog({ ambassadors, countries, documentTypes, occupations, maritalStatuses, regions = [], provinces = [], districts = [], networkMode = false }: { ambassadors: AmbassadorOption[]; countries: CountryOption[]; documentTypes: CountryOption[]; occupations: CountryOption[]; maritalStatuses: CountryOption[]; regions?: AddressOption[]; provinces?: AddressOption[]; districts?: AddressOption[]; networkMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ code: string; sent: boolean; message: string } | null>(null);

  return <>
    <button className="primary-button" onClick={() => { setCreated(null); setOpen(true); }}><UserRoundPlus size={17} /> {networkMode ? "Registrar socio en mi red" : "Registrar persona"}</button>
    {created && <span className="toast-message" role="status">Código {created.code}. {created.message}</span>}
    {open && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
        <div className="dialog-header"><div><span className="eyebrow">Nueva identidad</span><h2 id="member-dialog-title">Registrar persona</h2><p>El sistema asignará un código único y enviará la invitación de acceso.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <MemberCreateForm ambassadors={ambassadors} countries={countries} documentTypes={documentTypes} occupations={occupations} maritalStatuses={maritalStatuses} regions={regions} provinces={provinces} districts={districts} networkMode={networkMode} onCancel={() => setOpen(false)} onCreated={(code, sent, message) => { setOpen(false); setCreated({ code, sent, message }); }} />
      </section>
    </div>}
  </>;
}
