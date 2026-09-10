"use client";

import { useActionState, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { updateProgramAction, type ProgramState } from "./actions";

type PlanData = { id?: string; termMonths: number; downPayment: number; financedAmount: number; monthlyPayment: number; sharesGranted: number | null; stayDaysGranted: number | null; active: boolean };
export type ProgramData = { id: string; name: string; cashPrice: number; separation: number; cashShares: number | null; cashStayDays: number | null; beneficiaryCap: number; marriedBeneficiaryCap: number; membershipName: string; shareholderCategory: string; observations: string; active: boolean; plans: PlanData[] };
const initialState: ProgramState = { success: false, message: "" };

function ProgramEditor({ program, onDone }: { program: ProgramData; onDone: (message: string) => void }) {
  const [plans, setPlans] = useState(program.plans);
  const [state, action, pending] = useActionState(updateProgramAction.bind(null, program.id), initialState);
  useEffect(() => { if (state.success) onDone(state.message); }, [state, onDone]);
  const updatePlan = (index: number, field: keyof PlanData, value: number | boolean | null) => setPlans((current) => current.map((plan, itemIndex) => itemIndex === index ? { ...plan, [field]: value } : plan));
  return <form action={action} className="member-form program-form">
    <div className="form-grid">
      <label className="form-wide"><span>Nombre del programa *</span><input name="name" defaultValue={program.name} required /></label>
      <label><span>Precio del programa *</span><input name="cashPrice" type="number" min="0" step="0.01" defaultValue={program.cashPrice} required /></label>
      <label><span>Separación *</span><input name="separation" type="number" min="0" step="0.01" defaultValue={program.separation} required /></label>
      <label><span>Acciones al contado</span><input name="cashShares" type="number" min="0" defaultValue={program.cashShares ?? ""} /></label>
      <label><span>Días de estadía al contado</span><input name="cashStayDays" type="number" min="0" defaultValue={program.cashStayDays ?? ""} /></label>
      <label><span>Máximo de beneficiarios *</span><input name="beneficiaryCap" type="number" min="1" defaultValue={program.beneficiaryCap} required /></label>
      <label><span>Beneficiarios con cónyuge *</span><input name="marriedBeneficiaryCap" type="number" min="0" defaultValue={program.marriedBeneficiaryCap} required /></label>
      <label><span>Membresía</span><input name="membershipName" defaultValue={program.membershipName} maxLength={160} /></label>
      <label><span>Categoría accionaria</span><input name="shareholderCategory" defaultValue={program.shareholderCategory} maxLength={80} /></label>
      <label className="form-wide"><span>Observaciones y beneficios</span><textarea name="observations" rows={3} defaultValue={program.observations} maxLength={500} /></label>
      <label className="check-field program-active"><input name="active" type="checkbox" value="true" defaultChecked={program.active} /><span>Programa activo para nuevas ventas</span></label>
    </div>
    <div className="program-plans-heading"><div><strong>Planes de financiación</strong><small>Plazos disponibles al registrar una venta a crédito.</small></div><button type="button" className="secondary-button" onClick={() => setPlans((current) => [...current, { termMonths: 1, downPayment: 0, financedAmount: 0, monthlyPayment: 0, sharesGranted: null, stayDaysGranted: null, active: true }])}><Plus size={15} /> Agregar plazo</button></div>
    <div className="program-plans">
      {plans.map((plan, index) => <div className="program-plan-row" key={plan.id ?? `new-${index}`}>
        <label><span>Meses</span><input type="number" min="1" max="120" value={plan.termMonths} disabled={Boolean(plan.id)} title={plan.id ? "Desactiva este plazo y crea uno nuevo para conservar el historial." : undefined} onChange={(event) => updatePlan(index, "termMonths", Number(event.target.value))} /></label>
        <label><span>Cuota inicial</span><input type="number" min="0" step="0.01" value={plan.downPayment} onChange={(event) => updatePlan(index, "downPayment", Number(event.target.value))} /></label>
        <label><span>Financiado</span><input type="number" min="0" step="0.01" value={plan.financedAmount} onChange={(event) => updatePlan(index, "financedAmount", Number(event.target.value))} /></label>
        <label><span>Mensualidad</span><input type="number" min="0" step="0.01" value={plan.monthlyPayment} onChange={(event) => updatePlan(index, "monthlyPayment", Number(event.target.value))} /></label>
        <label><span>Acciones</span><input type="number" min="0" value={plan.sharesGranted ?? ""} onChange={(event) => updatePlan(index, "sharesGranted", event.target.value ? Number(event.target.value) : null)} /></label>
        <label><span>Días estadía</span><input type="number" min="0" value={plan.stayDaysGranted ?? ""} onChange={(event) => updatePlan(index, "stayDaysGranted", event.target.value ? Number(event.target.value) : null)} /></label>
        <label className="check-field plan-active"><input type="checkbox" checked={plan.active} onChange={(event) => updatePlan(index, "active", event.target.checked)} /><span>Activo</span></label>
        {!plan.id && <button type="button" className="icon-button" aria-label="Eliminar nuevo plazo" onClick={() => setPlans((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button>}
      </div>)}
      {plans.length === 0 && <p className="form-message">Este programa no tiene planes de financiación.</p>}
    </div>
    <input type="hidden" name="plansJson" value={JSON.stringify(plans)} />
    {state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}
    <div className="dialog-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar cambios"}</button></div>
  </form>;
}

export function ProgramAdminDialog({ programs }: { programs: ProgramData[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(programs[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const selected = programs.find((program) => program.id === selectedId) ?? programs[0];
  return <><button className="primary-button" type="button" onClick={() => { setMessage(""); setOpen(true); }}><Pencil size={16} /> Administrar programas</button>{message && <span className="toast-message">{message}</span>}{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog program-dialog" role="dialog" aria-modal="true" aria-labelledby="program-admin-title"><div className="dialog-header"><div><span className="eyebrow">Catálogo comercial</span><h2 id="program-admin-title">Administrar programas</h2><p>Edita condiciones comerciales y planes disponibles para nuevas ventas.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="program-selector" role="tablist">{programs.map((program) => <button type="button" role="tab" aria-selected={program.id === selected?.id} className={program.id === selected?.id ? "active" : ""} key={program.id} onClick={() => setSelectedId(program.id)}>{program.name}</button>)}</div>{selected && <ProgramEditor key={selected.id} program={selected} onDone={(text) => { setOpen(false); setMessage(text); }} />}</section></div>}</>;
}
