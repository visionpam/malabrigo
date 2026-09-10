"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { updateOwnProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = { success: false, message: "" };
const countries = [{ code: "PE", name: "Perú" }, { code: "CO", name: "Colombia" }, { code: "EC", name: "Ecuador" }, { code: "CL", name: "Chile" }, { code: "US", name: "Estados Unidos" }];

export function ProfileForm({ profile }: { profile: { email: string; phone: string; countryCode: string; residence: string; occupation: string } }) {
  const [state, action, pending] = useActionState(updateOwnProfileAction, initialState);
  return <form action={action} className="member-form account-profile-form"><div className="form-grid">
    <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" autoComplete="email" defaultValue={profile.email} required />{state.errors?.email?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <label><span>Teléfono</span><input name="phone" autoComplete="tel" defaultValue={profile.phone} maxLength={30} />{state.errors?.phone?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <label><span>País *</span><select name="countryCode" defaultValue={profile.countryCode} required>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select>{state.errors?.countryCode?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <label className="form-wide"><span>Residencia</span><input name="residence" defaultValue={profile.residence} maxLength={180} placeholder="Ciudad y dirección" />{state.errors?.residence?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <label className="form-wide"><span>Ocupación</span><input name="occupation" defaultValue={profile.occupation} maxLength={140} />{state.errors?.occupation?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
  </div>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<div className="dialog-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar datos"}</button></div></form>;
}
