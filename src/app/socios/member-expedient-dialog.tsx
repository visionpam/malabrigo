"use client";

import { useState } from "react";
import { BadgeCheck, FolderOpen, X, XCircle } from "lucide-react";
import { reviewMemberDocumentAction } from "./expedient-actions";

const categoryLabels: Record<string, string> = { IDENTITY: "Identidad", SEPARATION_FORM: "Ficha de separación", SEPARATION_PROOF: "Comprobante de separación", SALE_PROOF: "Comprobante de venta", SIGNED_CONTRACT: "Contrato firmado", ANNEX: "Anexo", OTHER: "Otro" };
type ExpedientMember = {
  id: string; name: string;
  documents: { id: string; title: string; category: string; url: string; status: string; rejectionReason?: string | null }[];
  sales: { id: string; code: string; program: string }[];
};

export function MemberExpedientDialog({ member }: { member: ExpedientMember }) {
  const [open, setOpen] = useState(false);
  return <><button className="row-action row-action-icon row-action-info" type="button" aria-label={`Documentos de ${member.name}`} title="Ver documentos" onClick={() => setOpen(true)}><FolderOpen size={17} aria-hidden="true" /></button>
    {open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="member-dialog expedient-dialog" role="dialog" aria-modal="true" aria-labelledby={"expedient-" + member.id}>
        <div className="dialog-header"><div><span className="eyebrow">Archivo integral</span><h2 id={"expedient-" + member.id}>{member.name}</h2><p>Documentos del socio y sus inversiones. Los titulares y beneficiarios se administran en Ventas, por programa.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <div className="expedient-content"><section>
          <div className="section-title"><div><h3>Documentos</h3><p>Archivos asociados al expediente y sus ventas.</p></div><span>{member.documents.length} archivos</span></div>
          {member.documents.length ? <div className="record-list">{member.documents.map((item) => <article key={item.id}><div><a href={item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong></a><span>{categoryLabels[item.category] ?? item.category} · {item.status === "APPROVED" ? "Aprobado" : item.status === "REJECTED" ? "Rechazado" + (item.rejectionReason ? ": " + item.rejectionReason : "") : "Pendiente"}</span>{item.status === "PENDING" && <div className="row-actions document-review-actions"><form action={reviewMemberDocumentAction.bind(null, item.id, "APPROVED")}><button className="row-action approve" type="submit"><BadgeCheck size={16} aria-hidden="true" />Aprobar</button></form><form action={reviewMemberDocumentAction.bind(null, item.id, "REJECTED")} className="inline-review-form"><input name="reason" aria-label="Motivo de rechazo" placeholder="Motivo" required /><button className="row-action danger-link" type="submit"><XCircle size={16} aria-hidden="true" />Rechazar</button></form></div>}</div><a href={item.url} target="_blank" rel="noreferrer" aria-label={"Abrir " + item.title}><FolderOpen size={16} /></a></article>)}</div> : <p className="inline-empty">No hay documentos en el expediente.</p>}
          <p className="expedient-cap-note">Los nuevos documentos y solicitudes se administran por venta, titular y beneficiario desde Ventas → Expediente. Los archivos anteriores se conservan aquí para consulta.</p>
        </section></div>
      </section>
    </div>}
  </>;
}
