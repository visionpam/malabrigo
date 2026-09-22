"use client";

import { useActionState, useEffect, useState } from "react";
import { FileImage, LoaderCircle, Pencil, Save, X } from "lucide-react";
import { updateRankAction, type RankState } from "./actions";

export type RankData = { code: string; name: string; memberCount: number; directCount: number; directPoints: number; totalPoints: number; deadlineMonths: number; monthlyBonus: number; rewardName: string; rewardDescription: string; logoUrl: string };
const initialState: RankState = { success: false, message: "" };

function RankEditor({ rank, onDone }: { rank: RankData; onDone: (message: string) => void }) {
  const [logoPreview, setLogoPreview] = useState(rank.logoUrl);
  const [logoError, setLogoError] = useState("");
  const [state, action, pending] = useActionState(updateRankAction.bind(null, rank.code), initialState);
  useEffect(() => { if (state.success) onDone(state.message); }, [state, onDone]);
  return <form action={action} className="member-form rank-form"><div className="form-grid">
    <label><span>Nombre del rango *</span><input name="name" defaultValue={rank.name} required /></label>
    <label><span>Plazo máximo (meses) *</span><input name="deadlineMonths" type="number" min="1" defaultValue={rank.deadlineMonths} required /></label>
    <label><span>Cantidad de socios mínimo *</span><input name="memberCount" type="number" min="1" defaultValue={rank.memberCount} required /></label>
    <label><span>Socios directos mínimo *</span><input name="directCount" type="number" min="0" defaultValue={rank.directCount} required /></label>
    <label><span>Puntos directos mínimo *</span><input name="directPoints" type="number" min="0" defaultValue={rank.directPoints} required /></label>
    <label><span>Puntos de volumen mínimo *</span><input name="totalPoints" type="number" min="0" defaultValue={rank.totalPoints} required /></label>
    <label><span>Bono mensual (USD) *</span><input name="monthlyBonus" type="number" min="0" step="0.01" defaultValue={rank.monthlyBonus} required /></label>
    <label><span>Premio</span><input name="rewardName" defaultValue={rank.rewardName} /></label>
    <input name="logoUrl" type="hidden" value={rank.logoUrl} />
    <label className="form-wide"><span>Logo del rango</span><input name="logoFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) { setLogoError(""); setLogoPreview(rank.logoUrl); return; } if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { event.currentTarget.value = ""; setLogoPreview(rank.logoUrl); setLogoError("Selecciona una imagen JPG, PNG o WebP de máximo 10 MB."); return; } setLogoError(""); setLogoPreview(URL.createObjectURL(file)); }} /><small className="password-hint">Carga una imagen JPG, PNG o WebP de hasta 10 MB. Si no seleccionas una, se conservará el logo actual.</small>{logoError && <small className="field-error">{logoError}</small>}</label>
    {logoPreview && <div className="rank-logo-preview form-wide"><FileImage size={17} /><img src={logoPreview} alt={`Vista previa del logo ${rank.name}`} onError={(event) => { event.currentTarget.style.display = "none"; }} /><span>Vista previa del logo</span></div>}
    <label className="form-wide"><span>Descripción del premio</span><textarea name="rewardDescription" rows={3} defaultValue={rank.rewardDescription} /></label>
  </div>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<div className="dialog-actions"><button className="primary-button" type="submit" disabled={pending || Boolean(logoError)}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar rango"}</button></div></form>;
}

export function RankAdminDialog({ ranks }: { ranks: RankData[] }) {
  const [open, setOpen] = useState(false); const [selectedCode, setSelectedCode] = useState(ranks[0]?.code ?? ""); const [message, setMessage] = useState("");
  const selected = ranks.find((rank) => rank.code === selectedCode) ?? ranks[0];
  return <><button className="primary-button" type="button" onClick={() => { setMessage(""); setOpen(true); }}><Pencil size={16} /> Administrar rangos</button>{message && <span className="toast-message">{message}</span>}{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog program-dialog" role="dialog" aria-modal="true" aria-labelledby="rank-admin-title"><div className="dialog-header"><div><span className="eyebrow">Plan de carrera</span><h2 id="rank-admin-title">Administrar rangos</h2><p>Configura requisitos, puntos, bonos, premios y el logo de cada rango.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="program-selector" role="tablist">{ranks.map((rank) => <button type="button" role="tab" aria-selected={rank.code === selected?.code} className={rank.code === selected?.code ? "active" : ""} key={rank.code} onClick={() => setSelectedCode(rank.code)}>{rank.name}</button>)}</div>{selected && <RankEditor key={selected.code} rank={selected} onDone={(text) => { setOpen(false); setMessage(text); }} />}</section></div>}</>;
}
