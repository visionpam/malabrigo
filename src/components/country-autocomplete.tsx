"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type CountryOption = { code: string; name: string };

export function CountryAutocomplete({ countries, defaultCode, name = "countryCode", placeholder = "Escribe para buscar", onCodeChange, disabled = false }: { countries: CountryOption[]; defaultCode?: string; name?: string; placeholder?: string; onCodeChange?: (code: string) => void; disabled?: boolean }) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = countries.find((country) => country.code === defaultCode);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [code, setCode] = useState(selected?.code ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!inputRef.current?.closest(".catalog-combobox")?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return countries;
    return countries.filter((country) => `${country.name} ${country.code}`.toLocaleLowerCase().includes(term));
  }, [countries, query]);

  function selectCountry(country: CountryOption) {
    setQuery(country.name);
    setCode(country.code);
    setOpen(false);
    onCodeChange?.(country.code);
  }

  return <div className="catalog-combobox">
    <div className="catalog-combobox-control">
      <input ref={inputRef} name={`${name}Search`} value={query} disabled={disabled} autoComplete={name === "countryCode" ? "country-name" : "off"} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setCode(""); onCodeChange?.(""); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }} required={name === "countryCode"} aria-autocomplete="list" aria-controls={listId} aria-describedby={`${listId}-hint`} />
      <button type="button" disabled={disabled} className="catalog-combobox-toggle" aria-label="Mostrar opciones" onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen((value) => !value); inputRef.current?.focus(); }}>⌄</button>
    </div>
    {open && !disabled && <div id={listId} className="catalog-combobox-menu" role="listbox">{filtered.length ? filtered.map((country) => <button type="button" role="option" aria-selected={country.code === code} key={country.code} onMouseDown={(event) => event.preventDefault()} onClick={() => selectCountry(country)}><span>{country.name}</span></button>) : <p>No hay coincidencias.</p>}</div>}
    <input type="hidden" name={name} value={code} required={name === "countryCode"} />
    <small id={`${listId}-hint`} className="password-hint">Escribe el nombre y selecciona una coincidencia.</small>
  </div>;
}
