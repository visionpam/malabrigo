"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileText, MessageSquareText, X } from "lucide-react";
import { DocumentRequestForm } from "@/app/mi-portal/documentos/document-request-form";

export function CustomerSupportFloating({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => { document.removeEventListener("keydown", closeOnEscape); document.removeEventListener("pointerdown", closeOutside); };
  }, [open]);

  return <>
    {open && <div className="support-popover" id="customer-support-panel" role="dialog" aria-label="Atención al cliente" ref={panelRef}>
      <div className="support-popover-header"><div><span className="eyebrow">Atención al cliente</span><h2>Solicitar documento</h2><p>Escríbenos y consulta la respuesta en una conversación privada.</p></div><button ref={closeRef} className="icon-button" type="button" aria-label="Cerrar atención al cliente" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}><X size={18} /></button></div>
      <div className="support-popover-links"><Link href="/mi-portal/documentos#solicitudes-de-documentos" onClick={() => setOpen(false)}><FileText size={16} aria-hidden="true" />Mis solicitudes</Link><Link href="/pqrs" onClick={() => setOpen(false)}><MessageSquareText size={16} aria-hidden="true" />Mis PQRS{unreadCount > 0 && <b>{unreadCount} nuevas</b>}</Link></div>
      <DocumentRequestForm />
    </div>}
    <button ref={triggerRef} className="pqrs-floating" type="button" aria-expanded={open} aria-controls={open ? "customer-support-panel" : undefined} onClick={() => setOpen((value) => !value)}><MessageSquareText size={20} aria-hidden="true" /><span>Atención al cliente</span>{unreadCount > 0 && <b aria-label={`${unreadCount} respuestas nuevas`}>{unreadCount > 9 ? "9+" : unreadCount}</b>}</button>
  </>;
}
