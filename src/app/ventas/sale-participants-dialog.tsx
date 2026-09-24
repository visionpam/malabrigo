"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2, UserRoundPlus, UsersRound, X } from "lucide-react";
import { addSaleParticipantAction, removeSaleParticipantAction, setOwnershipTypeAction, type ParticipantState } from "./participant-actions";

const initialState: ParticipantState = { success: false, message: "" };
type Person = { id: string; fullName: string; document: string | null; relationship: string; isHolder: boolean };
export type SaleParticipantsData = {
  id: string; code: string; status: string; memberName: string; memberDocument: string; programName: string;
  ownershipType: "SINGLE" | "MARRIED";
  holderCap: number; beneficiaryCap: number; marriedHolderCap: number; marriedBeneficiaryCap: number;
  people: Person[];
};

function OwnershipForm({ sale }: { sale: SaleParticipantsData }) {
  const [state, action, pending] = useActionState(setOwnershipTypeAction.bind(null, sale.id), initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state, router]);
  return <form action={action} className="sale-participant-mode">
    <label><span>Modalidad de titulares de esta venta</span><select name="ownershipType" defaultValue={sale.ownershipType} key={sale.ownershipType}><option value="SINGLE">Un contratante</option><option value="MARRIED">Sociedad conyugal</option></select></label>
    <button type="submit" className="secondary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={16} /> : null}Guardar modalidad</button>
    {state.message && <p className={"form-message " + (state.success ? "success" : "error")}>{state.message}</p>}
  </form>;
}

function PersonForm({ saleId, isHolder, spouse = false }: { saleId: string; isHolder: boolean; spouse?: boolean }) {
  const [state, action, pending] = useActionState(addSaleParticipantAction.bind(null, saleId, isHolder), initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state, router]);
  return <form action={action} className="operation-card sale-participant-form">
    <div className="form-grid">
      <label><span>Nombre completo *</span><input name="fullName" maxLength={180} required /></label>
      <label><span>Documento de identidad *</span><input name="document" maxLength={60} required /></label>
      <label><span>Parentesco *</span><input name="relationship" maxLength={60} defaultValue={spouse ? "Cónyuge" : ""} readOnly={spouse} placeholder={isHolder ? "Cónyuge, cotitular..." : "Hijo/a, familiar..."} required /></label>
    </div>
    {state.message && <p className={"form-message " + (state.success ? "success" : "error")}>{state.message}</p>}
    <button type="submit" className="secondary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={16} /> : <UserRoundPlus size={16} />}Agregar {isHolder ? "titular" : "beneficiario"}</button>
  </form>;
}

export function SaleParticipantsDialog({ sale }: { sale: SaleParticipantsData }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"holders" | "beneficiaries">("holders");
  const holders = sale.people.filter((person) => person.isHolder);
  const beneficiaries = sale.people.filter((person) => !person.isHolder);
  const holderCap = sale.ownershipType === "MARRIED" ? sale.marriedHolderCap : sale.holderCap;
  const beneficiaryCap = sale.ownershipType === "MARRIED" ? sale.marriedBeneficiaryCap : sale.beneficiaryCap;
  const editable = sale.status !== "CANCELLED";
  const selectTab = (next: "holders" | "beneficiaries") => { setTab(next); document.getElementById("sale-people-" + sale.id + "-" + next)?.focus(); };
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); selectTab(tab === "holders" ? "beneficiaries" : "holders"); } };
  const personList = (people: Person[]) => people.length ? <div className="record-list">{people.map((person) => <article key={person.id}><div><strong>{person.fullName}</strong><span>{person.relationship} · {person.document}</span></div>{editable && <form action={removeSaleParticipantAction.bind(null, sale.id, person.id)}><button type="submit" className="icon-button danger-icon" aria-label={"Eliminar a " + person.fullName} onClick={(event) => { if (!window.confirm("¿Eliminar a " + person.fullName + " de este programa?")) event.preventDefault(); }}><Trash2 size={16} /></button></form>}</article>)}</div> : <p className="inline-empty">Aún no hay personas adicionales en esta categoría.</p>;
  return <><button type="button" className="row-action row-action-icon row-action-info" aria-label={`Titulares y beneficiarios de ${sale.code}`} title="Titulares y beneficiarios" onClick={() => { setTab("holders"); setOpen(true); }}><UsersRound size={17} aria-hidden="true" /></button>
    {open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog expedient-dialog sale-participants-dialog" role="dialog" aria-modal="true" aria-labelledby={"participants-" + sale.id}>
        <div className="dialog-header"><div><span className="eyebrow">Asignación por programa</span><h2 id={"participants-" + sale.id}>{sale.programName}</h2><p>Venta {sale.code} · Inversionista {sale.memberName}. Cada venta tiene cupos independientes.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <div className="sale-participant-content">
          {editable && <OwnershipForm sale={sale} />}
          <div className="expedient-tabs" role="tablist" aria-label="Personas asignadas al programa">
            <button id={"sale-people-" + sale.id + "-holders"} type="button" role="tab" aria-selected={tab === "holders"} aria-controls={"sale-people-panel-" + sale.id} tabIndex={tab === "holders" ? 0 : -1} className={tab === "holders" ? "active" : ""} onClick={() => setTab("holders")} onKeyDown={onTabKeyDown}><UsersRound size={17} />Titulares <span>{holders.length + 1}/{holderCap}</span></button>
            <button id={"sale-people-" + sale.id + "-beneficiaries"} type="button" role="tab" aria-selected={tab === "beneficiaries"} aria-controls={"sale-people-panel-" + sale.id} tabIndex={tab === "beneficiaries" ? 0 : -1} className={tab === "beneficiaries" ? "active" : ""} onClick={() => setTab("beneficiaries")} onKeyDown={onTabKeyDown}><UserRoundPlus size={17} />Beneficiarios <span>{beneficiaries.length}/{beneficiaryCap}</span></button>
          </div>
          <div className="expedient-content">
            {tab === "holders" ? <section id={"sale-people-panel-" + sale.id} role="tabpanel" aria-labelledby={"sale-people-" + sale.id + "-holders"} tabIndex={0}><div className="section-title"><div><h3>Titulares de este programa</h3><p>El inversionista es siempre el titular principal y no puede eliminarse.</p></div><span>{holders.length + 1} de {holderCap}</span></div><div className="expedient-cap"><strong>{Math.max(0, holderCap - holders.length - 1)} cupos disponibles</strong><progress max={holderCap} value={Math.min(holderCap, holders.length + 1)} aria-label={"Titulares: " + (holders.length + 1) + " de " + holderCap} /></div><div className="record-list expedient-person-list"><article className="expedient-primary-holder"><div><strong>{sale.memberName}</strong><span>Documento {sale.memberDocument}</span></div><b>Titular principal</b></article></div>{personList(holders)}{editable && holders.length + 1 < holderCap && <PersonForm saleId={sale.id} isHolder spouse={sale.ownershipType === "MARRIED" && holders.length === 0} />}{editable && holders.length + 1 >= holderCap && <p className="expedient-cap-note">Se alcanzó el máximo de titulares de esta modalidad.</p>}</section>
              : <section id={"sale-people-panel-" + sale.id} role="tabpanel" aria-labelledby={"sale-people-" + sale.id + "-beneficiaries"} tabIndex={0}><div className="section-title"><div><h3>Beneficiarios de este programa</h3><p>Estas personas no ocupan cupos de otras ventas del inversionista.</p></div><span>{beneficiaries.length} de {beneficiaryCap}</span></div><div className="expedient-cap"><strong>{Math.max(0, beneficiaryCap - beneficiaries.length)} cupos disponibles</strong><progress max={Math.max(beneficiaryCap, 1)} value={beneficiaries.length} aria-label={"Beneficiarios: " + beneficiaries.length + " de " + beneficiaryCap} /></div>{personList(beneficiaries)}{editable && beneficiaries.length < beneficiaryCap && <PersonForm saleId={sale.id} isHolder={false} />}{editable && beneficiaries.length >= beneficiaryCap && <p className="expedient-cap-note">Esta modalidad no tiene más cupos de beneficiarios.</p>}</section>}
          </div>
        </div>
      </section>
    </div>}
  </>;
}
