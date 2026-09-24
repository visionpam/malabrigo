"use client";

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, FilePenLine, FilePlus2, LoaderCircle, Plus, Save, X } from "lucide-react";
import { createContractTemplateAction, generateContractAction, updateContractAction, voidContractAction, type ContractState } from "./actions";

const initial: ContractState = { success: false, message: "" };
const defaultContent = `CONTRATO DE PARTICIPACIÓN\n\nEntre Malabrigo Club Resort y {{NOMBRE_SOCIO}}, identificado con {{DOCUMENTO}}, código de socio {{CODIGO_SOCIO}}, se celebra el presente contrato correspondiente a la venta {{CODIGO_VENTA}}.\n\nPrograma: {{PROGRAMA}}\nValor: {{VALOR}}\nModalidad: {{MODALIDAD}}\nFecha: {{FECHA}}\n\nLas partes declaran conocer y aceptar las condiciones del programa y sus anexos.`;
type Option = { id: string; label: string };

function SearchableOption({ name, label, options, placeholder }: { name: string; label: string; options: Option[]; placeholder: string }) {
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const matches = useMemo(() => showAll ? options : options.filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [options, query, showAll]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  function choose(option: Option) {
    setQuery(option.label);
    setSelectedId(option.id);
    setOpen(false);
    inputRef.current?.setCustomValidity("");
  }
  return <div className="form-wide searchable-field"><label htmlFor={inputId}><span>{label} *</span></label><div className="catalog-combobox" ref={containerRef}><div className="catalog-combobox-control"><input id={inputId} ref={inputRef} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-label={label} value={query} required autoComplete="off" placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setSelectedId(""); setShowAll(false); setHighlighted(0); setOpen(true); event.target.setCustomValidity(event.target.value ? `Selecciona ${label.toLocaleLowerCase()} de la lista.` : ""); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setHighlighted((index) => Math.min(index + 1, matches.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setHighlighted((index) => Math.max(index - 1, 0)); } if (event.key === "Enter" && open && matches[highlighted]) { event.preventDefault(); choose(matches[highlighted]); } }} /><button type="button" className="catalog-combobox-toggle" aria-label={`Mostrar ${label.toLocaleLowerCase()}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (open) { setOpen(false); return; } setShowAll(true); setHighlighted(0); setOpen(true); inputRef.current?.focus(); }}>⌄</button></div>{open && <div id={listId} className="catalog-combobox-menu" role="listbox">{matches.length ? matches.map((option, index) => <button key={option.id} type="button" role="option" aria-selected={option.id === selectedId} className={index === highlighted ? "is-highlighted" : undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>{option.label}</button>) : <p>No hay coincidencias.</p>}</div>}<input type="hidden" name={name} value={selectedId} /><small className="password-hint">Escribe para filtrar o abre la lista y selecciona una opción.</small></div></div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="member-dialog" role="dialog" aria-modal="true" aria-labelledby="contract-dialog-title"><div className="dialog-header"><div><span className="eyebrow">Documentación legal</span><h2 id="contract-dialog-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>{children}</section></div>; }
function Feedback({ state }: { state: ContractState }) { return state.message ? <p className={`form-message ${state.success ? "success" : "error"}`} aria-live="polite">{state.message}</p> : null; }

export function ContractActions({ templates, sales }: { templates: Option[]; sales: Option[] }) {
  const [mode, setMode] = useState<"template" | "generate" | null>(null); const router = useRouter();
  const [templateState, templateAction, templatePending] = useActionState(createContractTemplateAction, initial);
  const [generationState, generationAction, generationPending] = useActionState(generateContractAction, initial);
  useEffect(() => { if (templateState.success || generationState.success) router.refresh(); }, [templateState.success, generationState.success, router]);
  return <><button className="secondary-button" type="button" onClick={() => setMode("generate")} disabled={!templates.length || !sales.length}><FilePlus2 size={17} />Generar contrato</button><button className="primary-button" type="button" onClick={() => setMode("template")}><Plus size={17} />Nueva plantilla</button>
    {mode === "template" && <Modal title="Nueva plantilla" subtitle="Crea una versión reutilizable con campos automáticos." onClose={() => setMode(null)}><form action={templateAction} className="member-form"><div className="form-grid"><label><span>Código *</span><input name="code" placeholder="CONTRATO_VIP" required /></label><label><span>Nombre *</span><input name="name" placeholder="Contrato de participación" required /></label><label className="form-wide"><span>Contenido *</span><textarea name="content" rows={14} defaultValue={defaultContent} required /></label></div><small>Campos disponibles: {"{{NOMBRE_SOCIO}}, {{DOCUMENTO}}, {{CODIGO_SOCIO}}, {{CODIGO_VENTA}}, {{PROGRAMA}}, {{VALOR}}, {{MODALIDAD}}, {{FECHA}}"}</small><Feedback state={templateState} /><div className="dialog-actions"><button className="cancel-button" type="button" onClick={() => setMode(null)}>Cancelar</button><button className="primary-button" disabled={templatePending}>{templatePending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}Crear plantilla</button></div></form></Modal>}
    {mode === "generate" && <Modal title="Generar contrato" subtitle="Asocia la plantilla vigente a una venta registrada." onClose={() => setMode(null)}><form action={generationAction} className="member-form"><div className="form-grid"><SearchableOption name="saleId" label="Venta" options={sales} placeholder="Buscar por código, socio o programa" /><SearchableOption name="templateId" label="Plantilla" options={templates} placeholder="Buscar plantilla por nombre o versión" /></div><Feedback state={generationState} /><div className="dialog-actions"><button className="cancel-button" type="button" onClick={() => setMode(null)}>Cancelar</button><button className="primary-button" disabled={generationPending}>{generationPending ? <LoaderCircle className="spinner" size={17} /> : <FilePlus2 size={17} />}Generar</button></div></form></Modal>}
  </>;
}

function ContractVoidForm({ id, onDone }: { id: string; onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState(voidContractAction.bind(null, id), initial);
  useEffect(() => { if (state.success) onDone(state.message); }, [state.success, state.message, onDone]);
  return <form action={action} className="void-form contract-void-form"><div className="warning-box"><Ban size={20} /><span><strong>El contrato quedará anulado</strong><small>Se conservarán el documento y su historial para auditoría. No podrás reactivarlo desde este panel.</small></span></div><label><span>Motivo de anulación *</span><textarea name="reason" minLength={8} maxLength={500} rows={4} placeholder="Explica por qué se anula este contrato" required /></label>{state.message && !state.success && <p className="form-message error" role="alert">{state.message}</p>}<div className="dialog-actions"><button className="danger-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Ban size={17} />}{pending ? "Anulando..." : "Confirmar anulación"}</button></div></form>;
}

export function ContractManage({ contract }: { contract: { id: string; status: string } }) {
  const [open, setOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState(updateContractAction.bind(null, contract.id), initial);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4000); return () => window.clearTimeout(timer); }, [message]);
  const voidDone = useCallback((text: string) => { setVoidOpen(false); setMessage(text); router.refresh(); }, [router]);
  return <><div className="row-actions"><button className="row-action row-action-icon edit-link" type="button" aria-label="Gestionar contrato" title="Gestionar contrato" disabled={contract.status === "VOIDED"} onClick={() => setOpen(true)}><FilePenLine size={17} aria-hidden="true" /></button><button className="row-action row-action-icon danger-link" type="button" aria-label="Anular contrato" title="Anular contrato" disabled={contract.status === "VOIDED"} onClick={() => setVoidOpen(true)}><Ban size={17} aria-hidden="true" /></button></div>{message && <span className="toast-message" role="status">{message}</span>}{open && <Modal title="Gestionar contrato" subtitle="Actualiza el envío o la firma del documento." onClose={() => setOpen(false)}><form action={action} className="member-form"><div className="form-grid"><label><span>Estado *</span><select name="status" defaultValue={contract.status === "DRAFT" ? "GENERATED" : contract.status}><option value="GENERATED">Generado</option><option value="SENT">Enviado</option><option value="SIGNED">Firmado</option></select></label><label><span>Contrato firmado PDF</span><input type="file" name="signedFile" accept="application/pdf" /></label></div><Feedback state={state} /><div className="dialog-actions"><button className="cancel-button" type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}Guardar</button></div></form></Modal>}{voidOpen && <Modal title="Anular contrato" subtitle="Confirma esta acción y deja constancia del motivo." onClose={() => setVoidOpen(false)}><ContractVoidForm id={contract.id} onDone={voidDone} /></Modal>}</>;
}
