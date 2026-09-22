"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, LoaderCircle, Upload, X } from "lucide-react";
import { createProjectStageAction, publishProjectUpdateAction, type ConstructionState } from "./actions";

const initial: ConstructionState = { success: false, message: "" };
type Stage = { id: string; name: string; progress: number };

function FieldError({ state, field, hidden }: { state: ConstructionState; field: string; hidden: boolean }) {
  return !hidden && !state.success && state.field === field ? <small className="construction-field-error" role="alert">{state.message}</small> : null;
}

function StageForm({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(createProjectStageAction.bind(null, projectId), initial);
  const [hiddenError, setHiddenError] = useState(false);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="member-form" onChangeCapture={() => setHiddenError(true)} onSubmit={() => setHiddenError(false)}>
    <div className="form-grid">
      <label><span>Nombre de la etapa *</span><input name="name" minLength={3} maxLength={160} required /><FieldError state={state} field="name" hidden={hiddenError} /></label>
      <label><span>Peso en el proyecto (%) *</span><input name="weight" type="number" min="0.01" max="100" step="0.01" required /><FieldError state={state} field="weight" hidden={hiddenError} /></label>
      <label><span>Fecha inicial</span><input name="startsAt" type="date" /><FieldError state={state} field="startsAt" hidden={hiddenError} /></label>
      <label><span>Fecha final</span><input name="endsAt" type="date" /><FieldError state={state} field="endsAt" hidden={hiddenError} /></label>
      <label className="form-wide"><span>Descripción</span><textarea name="description" rows={4} maxLength={1500} /><FieldError state={state} field="description" hidden={hiddenError} /></label>
    </div>
    {state.message && !state.success && !hiddenError && <p className="form-message error" role="alert">{state.message}</p>}
    <div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <CalendarPlus size={17} />}{pending ? "Guardando..." : "Crear etapa"}</button></div>
  </form>;
}

function UpdateForm({ stages, onClose, onDone }: { stages: Stage[]; onClose: () => void; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(publishProjectUpdateAction, initial);
  const [hiddenError, setHiddenError] = useState(false);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="member-form" onChangeCapture={() => setHiddenError(true)} onSubmit={() => setHiddenError(false)}>
    <div className="form-grid">
      <label className="form-wide"><span>Etapa *</span><select name="stageId" required>{stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.name} · {stage.progress}%</option>)}</select><FieldError state={state} field="stageId" hidden={hiddenError} /></label>
      <label><span>Título *</span><input name="title" minLength={3} maxLength={180} required /><FieldError state={state} field="title" hidden={hiddenError} /></label>
      <label><span>Avance acumulado (%) *</span><input name="progress" type="number" min="0" max="100" step="0.1" required /><FieldError state={state} field="progress" hidden={hiddenError} /></label>
      <label><span>Fecha del avance *</span><input name="occurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><FieldError state={state} field="occurredAt" hidden={hiddenError} /></label>
      <label><span>Evidencia</span><input name="media" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" /><small className="password-hint">JPG, PNG, WebP o PDF · máximo 12 MB.</small><FieldError state={state} field="media" hidden={hiddenError} /></label>
      <label className="form-wide"><span>Descripción de la evidencia</span><input name="altText" maxLength={220} /><FieldError state={state} field="altText" hidden={hiddenError} /></label>
      <label className="form-wide"><span>Descripción del avance *</span><textarea name="description" rows={5} minLength={10} maxLength={3000} required /><FieldError state={state} field="description" hidden={hiddenError} /></label>
    </div>
    {state.message && !state.success && !hiddenError && <p className="form-message error" role="alert">{state.message}</p>}
    <div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Upload size={17} />}{pending ? "Publicando..." : "Publicar"}</button></div>
  </form>;
}

export function ConstructionDialog({ stages, projectId }: { stages: Stage[]; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"update" | "stage">(stages.length ? "update" : "stage");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const done = useCallback((text: string) => { setOpen(false); setMessage(text); router.refresh(); }, [router]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  return <><button className="primary-button" type="button" onClick={() => setOpen(true)}><Upload size={17} />Publicar avance</button>{message && <span className="toast-message" role="status">{message}</span>}{open && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="construction-dialog-title"><div className="dialog-header"><div><span className="eyebrow">Seguimiento de obra</span><h2 id="construction-dialog-title">Actualizar proyecto</h2><p>Configura el cronograma y publica evidencias para los socios.</p></div><button className="icon-button" aria-label="Cerrar" type="button" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="program-selector" role="tablist"><button type="button" role="tab" aria-selected={tab === "update"} className={tab === "update" ? "active" : ""} disabled={!stages.length} onClick={() => setTab("update")}>Publicar avance</button><button type="button" role="tab" aria-selected={tab === "stage"} className={tab === "stage" ? "active" : ""} onClick={() => setTab("stage")}>Nueva etapa</button></div>{tab === "stage" ? <StageForm projectId={projectId} onClose={() => setOpen(false)} onDone={done} /> : <UpdateForm stages={stages} onClose={() => setOpen(false)} onDone={done} />}</section></div>}</>;
}
