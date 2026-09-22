"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LoaderCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { deleteContractTemplateAction, updateContractTemplateAction, type ContractState } from "./actions";

type Template = { id: string; code: string; name: string; version: number; content: string; used: boolean };
const initial: ContractState = { success: false, message: "" };

function TemplateModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="template-action-title"><div className="dialog-header"><div><span className="eyebrow">Documentación legal</span><h2 id="template-action-title">{title}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>{children}</section></div>;
}

function EditTemplate({ template, onDone }: { template: Template; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(updateContractTemplateAction.bind(null, template.id), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="member-form"><div className="form-grid"><label><span>Código *</span><input name="code" defaultValue={template.code} readOnly={template.used} required /></label><label><span>Nombre *</span><input name="name" defaultValue={template.name} required /></label><label className="form-wide"><span>Contenido *</span><textarea name="content" rows={14} defaultValue={template.content} required /></label></div>{template.used && <small>Esta versión ya se usó. Al guardar, se creará una nueva versión sin modificar los contratos existentes.</small>}{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}{pending ? "Guardando..." : "Guardar plantilla"}</button></div></form>;
}

function DeleteTemplate({ template, onDone }: { template: Template; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(deleteContractTemplateAction.bind(null, template.id), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="member-form"><p>¿Eliminar definitivamente <strong>{template.name} v{template.version}</strong>? Esta acción no se puede deshacer.</p>{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="danger-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Trash2 size={17} />}{pending ? "Eliminando..." : "Sí, eliminar plantilla"}</button></div></form>;
}

export function TemplateRowActions({ template }: { template: Template }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  const done = useCallback((text: string) => { setMode(null); setMessage(text); router.refresh(); }, [router]);
  return <><div className="row-actions"><button className="row-action" type="button" onClick={() => setMode("view")}><Eye size={14} /> Ver</button><button className="row-action" type="button" onClick={() => setMode("edit")}><Pencil size={14} /> Editar</button><button className="row-action danger" type="button" onClick={() => setMode("delete")} disabled={template.used} title={template.used ? "No se puede eliminar una plantilla usada en contratos" : undefined}><Trash2 size={14} /> Eliminar</button></div>{message && <span className="toast-message" role="status">{message}</span>}{mode === "view" && <TemplateModal title={`${template.name} · v${template.version}`} onClose={() => setMode(null)}><div className="member-form"><p><strong>Código:</strong> {template.code}</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit" }}>{template.content}</pre><div className="dialog-actions"><button className="cancel-button" type="button" onClick={() => setMode(null)}>Cerrar</button></div></div></TemplateModal>}{mode === "edit" && <TemplateModal title={`Editar ${template.name}`} onClose={() => setMode(null)}><EditTemplate template={template} onDone={done} /></TemplateModal>}{mode === "delete" && <TemplateModal title="Eliminar plantilla" onClose={() => setMode(null)}><DeleteTemplate template={template} onDone={done} /></TemplateModal>}</>;
}
