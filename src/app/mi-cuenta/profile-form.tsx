"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { updateOwnProfileAction, type ProfileState } from "./actions";
import { CountryAutocomplete, type CountryOption } from "@/components/country-autocomplete";
import { AddressFields, type AddressOption } from "@/components/address-fields";

const initialState: ProfileState = { success: false, message: "" };
export function ProfileForm({ profile, countries, occupations, regions, provinces, districts }: { profile: { email: string; phone: string; countryCode: string; regionCode?: string | null; provinceCode?: string | null; districtCode?: string | null; residence: string; occupation: string }; countries: CountryOption[]; occupations: CountryOption[]; regions: AddressOption[]; provinces: AddressOption[]; districts: AddressOption[] }) {
  const [state, action, pending] = useActionState(updateOwnProfileAction, initialState);
  return <form action={action} className="member-form account-profile-form"><div className="form-grid">
    <label><span>Teléfono con indicativo</span><input name="phone" autoComplete="tel" defaultValue={profile.phone} maxLength={30} placeholder="+51 999 999 999" />{state.errors?.phone?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <label className="form-wide"><span>Correo electrónico *</span><input name="email" type="email" autoComplete="email" defaultValue={profile.email} required />{state.errors?.email?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <AddressFields countries={countries} regions={regions} provinces={provinces} districts={districts} defaultCountryCode={profile.countryCode} defaultRegionCode={profile.regionCode ?? undefined} defaultProvinceCode={profile.provinceCode ?? undefined} defaultDistrictCode={profile.districtCode ?? undefined} errors={state.errors} />
    <label className="form-wide"><span>Dirección</span><input name="residence" defaultValue={profile.residence} maxLength={180} placeholder="Calle, número, ciudad" />{state.errors?.residence?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <label className="form-wide"><span>Ocupación</span><CountryAutocomplete countries={occupations} defaultCode={profile.occupation} name="occupation" placeholder="Buscar ocupación" />{state.errors?.occupation?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
  </div>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<div className="dialog-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar datos"}</button></div></form>;
}
