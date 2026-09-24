"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, FilePlus2, FolderOpen, LoaderCircle, X, XCircle } from "lucide-react";
import { reviewMemberDocumentAction, uploadMemberDocumentAction, type ExpedientState } from "./expedient-actions";

const initialState: ExpedientState = { success: false, message: "" };
const categoryLabels: Record<string, string> = { IDENTITY: "Identidad", SEPARATION_FORM: "Ficha de separación", SEPARATION_PROOF: "Comprobante de separación", SALE_PROOF: "Comprobante de venta", SIGNED_CONTRACT: "Contrato firmado", ANNEX: "Anexo", OTHER: "Otro" };
type ExpedientMember = {
  id: string; name: string;
  documents: { id: string; title: string; category: string; url: string; status: string; rejectionReason?: string | null }[];
  sales: { id: string; code: string; program: string }[];
};

function DocumentForm({ member, onSaved }: { member: ExpedientMember; onSaved: () => void }) {
  const [state, action, pending] = useActionState(uploadMemberDocumentAction.bind(null, member.id), initialState);
  useEffect(() => { if (state.success) onSaved(); }, [state.success, onSaved]);
  return <form action={action} className="operation-card expedient-document-form">
    <div className="form-grid">
      <label><span>Tipo *</span><select name="category" required>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>Título *</span><input name="title" required maxLength={180} /></label>
      <label><span>Venta relacionada</span><select name="saleId"><option value="">Expediente general</option>{member.sales.map((sale) => <option value={sale.id} key={sale.id}>{sale.code} · {sale.program}</option>)}</select></label>
      <label><span>Archivo *</span><input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" required /></label>
    </div>
    <small>JPG, PNG o PDF. Máximo 12 MB.</small>
    {state.message && <p className={"form-message " + (state.success ? "success" : "error")}>{state.message}</p>}
    <button className="secondary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={16} /> : <FilePlus2 size={16} />}Subir documento</button>
  </form>;
}

export function MemberExpedientDialog({ member }: { member: ExpedientMember }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const refresh = () => router.refresh();
  return <><button className="row-action row-action-icon row-action-info" type="button" aria-label={`Documentos de ${member.name}`} title="Ver documentos" onClick={() => setOpen(true)}><FolderOpen size={17} aria-hidden="true" /></button>
    {open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog expedient-dialog" role="dialog" aria-modal="true" aria-labelledby={"expedient-" + member.id}>
        <div className="dialog-header"><div><span className="eyebrow">Archivo integral</span><h2 id={"expedient-" + member.id}>{member.name}</h2><p>Documentos del socio y sus inversiones. Los titulares y beneficiarios se administran en Ventas, por programa.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <div className="expedient-content"><section>
          <div className="section-title"><div><h3>Documentos</h3><p>Archivos asociados al expediente y sus ventas.</p></div><span>{member.documents.length} archivos</span></div>
          {member.documents.length ? <div className="record-list">{member.documents.map((item) => <article key={item.id}><div><a href={item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong></a><span>{categoryLabels[item.category] ?? item.category} · {item.status === "APPROVED" ? "Aprobado" : item.status === "REJECTED" ? "Rechazado" + (item.rejectionReason ? ": " + item.rejectionReason : "") : "Pendiente"}</span>{item.status === "PENDING" && <div className="row-actions document-review-actions"><form action={reviewMemberDocumentAction.bind(null, item.id, "APPROVED")}><button className="row-action approve" type="submit"><BadgeCheck size={16} aria-hidden="true" />Aprobar</button></form><form action={reviewMemberDocumentAction.bind(null, item.id, "REJECTED")} className="inline-review-form"><input name="reason" aria-label="Motivo de rechazo" placeholder="Motivo" required /><button className="row-action danger-link" type="submit"><XCircle size={16} aria-hidden="true" />Rechazar</button></form></div>}</div><a href={item.url} target="_blank" rel="noreferrer" aria-label={"Abrir " + item.title}><FolderOpen size={16} /></a></article>)}</div> : <p className="inline-empty">No hay documentos en el expediente.</p>}
          <DocumentForm member={member} onSaved={refresh} />
        </section></div>
      </section>
    </div>}
  </>;
}
