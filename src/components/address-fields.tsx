"use client";

import { useMemo, useState } from "react";
import { CountryAutocomplete, type CountryOption } from "./country-autocomplete";

export type AddressOption = CountryOption & { countryCode?: string; parentCode?: string };
type Props = { countries: CountryOption[]; regions: AddressOption[]; provinces: AddressOption[]; districts: AddressOption[]; defaultCountryCode?: string; defaultRegionCode?: string; defaultProvinceCode?: string; defaultDistrictCode?: string; errors?: Record<string, string[]> };

function Field({ label, options, defaultCode, name, placeholder, disabled, onCodeChange, error }: { label: string; options: CountryOption[]; defaultCode?: string; name: string; placeholder: string; disabled?: boolean; onCodeChange?: (code: string) => void; error?: string[] }) {
  return <label><span>{label}</span><CountryAutocomplete countries={options} defaultCode={defaultCode} name={name} placeholder={disabled ? "No aplica" : placeholder} disabled={disabled} onCodeChange={onCodeChange} />{error?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>;
}

export function AddressFields({ countries, regions, provinces, districts, defaultCountryCode = "PE", defaultRegionCode, defaultProvinceCode, defaultDistrictCode, errors }: Props) {
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [regionCode, setRegionCode] = useState(defaultRegionCode ?? "");
  const [provinceCode, setProvinceCode] = useState(defaultProvinceCode ?? "");
  const [, setDistrictCode] = useState(defaultDistrictCode ?? "");
  const countryRegions = useMemo(() => regions.filter((item) => item.countryCode === countryCode), [regions, countryCode]);
  const regionProvinces = useMemo(() => provinces.filter((item) => item.parentCode === regionCode), [provinces, regionCode]);
  const provinceDistricts = useMemo(() => districts.filter((item) => item.parentCode === provinceCode), [districts, provinceCode]);
  const supportsAddress = countryRegions.length > 0;
  const updateCountry = (code: string) => { setCountryCode(code); setRegionCode(""); setProvinceCode(""); setDistrictCode(""); };
  const updateRegion = (code: string) => { setRegionCode(code); setProvinceCode(""); setDistrictCode(""); };
  const updateProvince = (code: string) => { setProvinceCode(code); setDistrictCode(""); };
  return <>
    <label><span>País *</span><CountryAutocomplete countries={countries} defaultCode={defaultCountryCode} onCodeChange={updateCountry} /><small className="password-hint">Selecciona el país para cargar su división territorial.</small>{errors?.countryCode?.map((message) => <small className="field-error" key={message}>{message}</small>)}</label>
    <Field label="Región / departamento" options={countryRegions} defaultCode={defaultRegionCode} name="regionCode" placeholder="Buscar región" disabled={!supportsAddress} onCodeChange={updateRegion} error={errors?.regionCode} />
    <Field label="Provincia" options={regionProvinces} defaultCode={defaultProvinceCode} name="provinceCode" placeholder="Buscar provincia" disabled={!supportsAddress || !regionCode} onCodeChange={updateProvince} error={errors?.provinceCode} />
    <Field label="Distrito / municipio" options={provinceDistricts} defaultCode={defaultDistrictCode} name="districtCode" placeholder="Buscar distrito" disabled={!supportsAddress || !provinceCode} onCodeChange={setDistrictCode} error={errors?.districtCode} />
  </>;
}
