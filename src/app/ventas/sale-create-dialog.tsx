"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, ShoppingBag, X } from "lucide-react";

import { createSaleAction, type CreateSaleState } from "./actions";

type PlanOption = { id: string; termMonths: number; downPayment: number; financedAmount: number; monthlyPayment: number };
type ProgramOption = { id: string; name: string; cashPrice: number; separation: number; plans: PlanOption[] };
type MemberOption = { id: string; name: string; document: string };

const initialState: CreateSaleState = { success: false, message: "" };
const usd = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" });

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.[0] ? <small className="field-error">{messages[0]}</small> : null;
}

function SaleCreateForm({ members, programs, onCancel, onCreated }: { members: MemberOption[]; programs: ProgramOption[]; onCancel: () => void; onCreated: (code: string) => void }) {
  const [state, formAction, pending] = useActionState(createSaleAction, initialState);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [mode, setMode] = useState<"CASH" | "CREDIT">("CASH");
  const [planId, setPlanId] = useState(programs[0]?.plans[0]?.id ?? "");
  const router = useRouter();
  const program = useMemo(() => programs.find((item) => item.id === programId), [programId, programs]);
  const plan = program?.plans.find((item) => item.id === planId);

  useEffect(() => {
    if (state.success && state.code) {
      router.refresh();
      onCreated(state.code);
    }
  }, [onCreated, router, state.code, state.success]);

  return <form action={formAction} className="member-form">
    <div className="form-grid">
      <label className="form-wide"><span>Socio *</span><select name="memberId" defaultValue={members[0]?.id} required disabled={members.length === 0}><option value="" disabled>Selecciona un socio</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.document}</option>)}</select><FieldError messages={state.errors?.memberId} /></label>
      <label><span>Programa *</span><select name="programId" value={programId} required onChange={(event) => { const nextProgram = programs.find((item) => item.id === event.target.value); setProgramId(event.target.value); setPlanId(nextProgram?.plans[0]?.id ?? ""); }}>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError messages={state.errors?.programId} /></label>
      <label><span>Modalidad *</span><select name="mode" value={mode} required onChange={(event) => setMode(event.target.value as "CASH" | "CREDIT")}><option value="CASH">Contado</option><option value="CREDIT">Crédito</option></select><FieldError messages={state.errors?.mode} /></label>
      {mode === "CREDIT" && <label className="form-wide"><span>Plan de financiación *</span><select name="financingPlanId" value={planId} required onChange={(event) => setPlanId(event.target.value)}><option value="" disabled>Selecciona un plazo</option>{program?.plans.map((item) => <option key={item.id} value={item.id}>{item.termMonths} meses · {usd.format(item.monthlyPayment)} mensuales</option>)}</select><FieldError messages={state.errors?.financingPlanId} /></label>}
      {mode === "CASH" && <input type="hidden" name="financingPlanId" value="" />}
    </div>
    {program && <section className="sale-summary" aria-live="polite"><div><span>Valor del programa</span><strong>{usd.format(program.cashPrice)}</strong></div><div><span>Separación</span><strong>{usd.format(program.separation)}</strong></div>{mode === "CREDIT" && plan && <><div><span>Cuota inicial</span><strong>{usd.format(plan.downPayment)}</strong></div><div><span>Saldo financiado</span><strong>{usd.format(plan.financedAmount)}</strong></div></>}</section>}
    {members.length === 0 && <p className="form-message error">Primero debes registrar un socio para asociarlo a la venta.</p>}
    {state.message && !state.success && <p className="form-message error" aria-live="polite">{state.message}</p>}
    <div className="dialog-actions"><button type="button" className="cancel-button" disabled={pending} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={pending || members.length === 0 || programs.length === 0}>{pending ? <LoaderCircle className="spinner" size={17} /> : <ShoppingBag size={17} />}{pending ? "Guardando..." : "Crear venta"}</button></div>
  </form>;
}

export function SaleCreateDialog({ members, programs }: { members: MemberOption[]; programs: ProgramOption[] }) {
  const [open, setOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState("");

  return <>
    <button className="primary-button" onClick={() => { setCreatedCode(""); setOpen(true); }}><Plus size={17} /> Nueva venta</button>
    {createdCode && <span className="toast-message" role="status">Venta {createdCode} registrada correctamente.</span>}
    {open && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="sale-dialog-title">
        <div className="dialog-header"><div><span className="eyebrow">Nueva operación</span><h2 id="sale-dialog-title">Registrar venta</h2><p>Selecciona el socio, programa y modalidad de pago.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <SaleCreateForm members={members} programs={programs} onCancel={() => setOpen(false)} onCreated={(code) => { setOpen(false); setCreatedCode(code); }} />
      </section>
    </div>}
  </>;
}
