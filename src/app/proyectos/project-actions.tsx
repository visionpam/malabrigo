"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, LoaderCircle, Pencil, Plus, Save, TriangleAlert, X } from "lucide-react";
import { saveConstructionProjectAction, setConstructionProjectActiveAction, type ProjectState } from "./actions";

export type ProjectInfo = { id: string; code: string; name: string; description: string | null; active: boolean };
const initial: ProjectState = { success: false, message: "" };

function ProjectForm({ project, onClose, onDone }: { project: ProjectInfo | null; onClose: () => void; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(saveConstructionProjectAction.bind(null, project?.id ?? null), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="member-form"><div className="form-grid"><label><span>Código *</span><input name="code" defaultValue={project?.code ?? ""} maxLength={40} required placeholder="EJ. MALABRIGO-01" /></label><label><span>Nombre del proyecto *</span><input name="name" defaultValue={project?.name ?? ""} maxLength={160} required /></label><label className="form-wide"><span>Descripción</span><textarea name="description" defaultValue={project?.description ?? ""} rows={4} maxLength={2000} /></label></div>{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar proyecto"}</button></div></form>;
}

function StatusForm({ project, onClose, onDone }: { project: ProjectInfo; onClose: () => void; onDone: (message: string) => void }) {
  const nextActive = !project.active;
  const [state, action, pending] = useActionState(setConstructionProjectActiveAction.bind(null, project.id, nextActive), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="void-form contract-void-form"><div className="warning-box"><TriangleAlert size={20} /><span><strong>{nextActive ? "Volver a activar el proyecto" : "Inactivar el proyecto"}</strong><small>{nextActive ? "Sus etapas y avances publicados volverán a mostrarse a los socios." : "No se podrán publicar nuevos avances y sus etapas dejarán de mostrarse en el portal. Los datos se conservan."}</small></span></div>{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className={nextActive ? "primary-button" : "danger-button"} disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : nextActive ? <Check size={17} /> : <Ban size={17} />}{pending ? "Guardando..." : nextActive ? "Activar" : "Inactivar"}</button></div></form>;
}

export function ProjectActions({ project = null }: { project?: ProjectInfo | null }) {
  const [mode, setMode] = useState<"edit" | "status" | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const done = useCallback((text: string) => { setMode(null); setMessage(text); router.refresh(); }, [router]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  return <><div className="row-actions">{project ? <><button className="row-action edit-link" type="button" onClick={() => setMode("edit")}><Pencil size={14} />Editar</button><button className={project.active ? "row-action danger-link" : "row-action"} type="button" onClick={() => setMode("status")}>{project.active ? <Ban size={14} /> : <Check size={14} />}{project.active ? "Inactivar" : "Activar"}</button></> : <button className="primary-button" type="button" onClick={() => setMode("edit")}><Plus size={17} />Nuevo proyecto</button>}</div>{message && <span className="toast-message" role="status">{message}</span>}{mode && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMode(null); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title"><div className="dialog-header"><div><span className="eyebrow">Administración de obra</span><h2 id="project-dialog-title">{mode === "status" ? `${project?.active ? "Inactivar" : "Activar"} proyecto` : project ? "Editar proyecto" : "Nuevo proyecto"}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setMode(null)}><X size={18} /></button></div>{mode === "edit" ? <ProjectForm project={project} onClose={() => setMode(null)} onDone={done} /> : project && <StatusForm project={project} onClose={() => setMode(null)} onDone={done} />}</section></div>}</>;
}
