"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle, Pencil, Save, TriangleAlert, X } from "lucide-react";
import { updateCompanyDocumentAction, voidCompanyDocumentAction, type DocumentState } from "./actions";

type Document = { id: string; title: string; category: string; visibility: string; status: string };
const initial: DocumentState = { success: false, message: "" };
const categories = [
  ["RENDER", "Renders"], ["PROJECT", "Proyecto"], ["TIMELINE", "Línea de tiempo"],
  ["CONSTRUCTION_PROGRESS", "Avance de obra"], ["CABINS", "Cabañas"], ["PLANS", "Planos"],
  ["CONTRACT_MODEL", "Modelo de contrato"], ["OTHER", "Otro"],
];

function ActionDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="document-action-title"><div className="dialog-header"><div><span className="eyebrow">Repositorio empresarial</span><h2 id="document-action-title">{title}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>{children}</section></div>;
}

function EditDocument({ document, onClose, onDone }: { document: Document; onClose: () => void; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(updateCompanyDocumentAction.bind(null, document.id), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="member-form"><div className="form-grid"><label><span>Categoría *</span><select name="category" defaultValue={document.category} required>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Visibilidad *</span><select name="visibility" defaultValue={document.visibility} required><option value="ALL_MEMBERS">Todos los socios</option><option value="ADMIN_ONLY">Solo administración</option></select></label><label className="form-wide"><span>Título *</span><input name="title" defaultValue={document.title} minLength={3} maxLength={180} required /></label><label className="form-wide"><span>Reemplazar archivo (opcional)</span><input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" /><small className="password-hint">Si no seleccionas otro archivo, se conserva el actual. Máximo 20 MB.</small></label></div>{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar cambios"}</button></div></form>;
}

function VoidDocument({ document, onClose, onDone }: { document: Document; onClose: () => void; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(voidCompanyDocumentAction.bind(null, document.id), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="void-form contract-void-form"><div className="warning-box"><TriangleAlert size={20} /><span><strong>El documento dejará de estar disponible para los socios.</strong><small>«{document.title}» permanecerá en administración como registro anulado. Esta acción no se puede revertir desde este panel.</small></span></div><label><span>Motivo de anulación *</span><textarea name="reason" minLength={8} maxLength={500} required placeholder="Indica por qué se anula este documento" /></label>{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="danger-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Ban size={17} />}{pending ? "Anulando..." : "Confirmar anulación"}</button></div></form>;
}

export function DocumentRowActions({ document }: { document: Document }) {
  const [mode, setMode] = useState<"edit" | "void" | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const done = useCallback((text: string) => { setMode(null); setMessage(text); router.refresh(); }, [router]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  return <><div className="row-actions">{document.status === "APPROVED" && <><button className="row-action row-action-icon edit-link" type="button" aria-label={`Editar ${document.title}`} title="Editar documento" onClick={() => setMode("edit")}><Pencil size={17} aria-hidden="true" /></button><button className="row-action row-action-icon danger-link" type="button" aria-label={`Anular ${document.title}`} title="Anular documento" onClick={() => setMode("void")}><Ban size={17} aria-hidden="true" /></button></>}</div>{message && <span className="toast-message" role="status">{message}</span>}{mode === "edit" && <ActionDialog title="Editar documento" onClose={() => setMode(null)}><EditDocument document={document} onClose={() => setMode(null)} onDone={done} /></ActionDialog>}{mode === "void" && <ActionDialog title="Anular documento" onClose={() => setMode(null)}><VoidDocument document={document} onClose={() => setMode(null)} onDone={done} /></ActionDialog>}</>;
}
