"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, X } from "lucide-react";
import { uploadCompanyDocumentAction, type DocumentState } from "./actions";

const initial: DocumentState = { success: false, message: "" };

function DocumentForm({ onClose, onPublished }: { onClose: () => void; onPublished: (message: string) => void }) {
  const [state, action, pending] = useActionState(uploadCompanyDocumentAction, initial);
  const [dismissedMessage, setDismissedMessage] = useState("");
  useEffect(() => { if (state.success) onPublished(state.message); }, [state.success, state.message, onPublished]);
  return <form action={action} className="member-form" onChangeCapture={() => setDismissedMessage(state.message)} onSubmit={() => setDismissedMessage("")}>
    <div className="form-grid">
      <label><span>Categoría *</span><select name="category" required><option value="RENDER">Renders</option><option value="PROJECT">Proyecto</option><option value="TIMELINE">Línea de tiempo</option><option value="CONSTRUCTION_PROGRESS">Avance de obra</option><option value="CABINS">Cabañas</option><option value="PLANS">Planos</option><option value="CONTRACT_MODEL">Modelo de contrato</option><option value="OTHER">Otro</option></select></label>
      <label><span>Visibilidad *</span><select name="visibility" required><option value="ALL_MEMBERS">Todos los socios</option><option value="ADMIN_ONLY">Solo administración</option></select></label>
      <label className="form-wide"><span>Título *</span><input name="title" minLength={3} maxLength={180} required /></label>
      <label className="form-wide"><span>Archivo *</span><input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required /><small className="password-hint">JPG, PNG, WebP o PDF de máximo 20 MB.</small></label>
    </div>
    {state.message && state.message !== dismissedMessage && <p className={`form-message ${state.success ? "success" : "error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
    <div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <FileUp size={17} />}{pending ? "Publicando..." : "Publicar"}</button></div>
  </form>;
}

export function DocumentDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const onPublished = useCallback((text: string) => { setOpen(false); setMessage(text); router.refresh(); }, [router]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  return <><button className="primary-button" onClick={() => { setMessage(""); setOpen(true); }}><FileUp size={17} />Publicar documento</button>{message && <span className="toast-message" role="status">{message}</span>}{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="company-document-title"><div className="dialog-header"><div><span className="eyebrow">Repositorio empresarial</span><h2 id="company-document-title">Publicar documento</h2><p>Define si será visible para todos los socios o únicamente para administración.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><DocumentForm onClose={() => setOpen(false)} onPublished={onPublished} /></section></div>}</>;
}
