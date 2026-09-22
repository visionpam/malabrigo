"use client";
import { useState } from "react";
import { Ban, CheckCircle2, Trash2 } from "lucide-react";
import { deleteMemberIfUnusedAction, toggleMemberAccessAction } from "./actions";
export function MemberRowActions({ memberId, blocked, deletable }: { memberId: string; blocked: boolean; deletable: boolean }) {
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const run = async (action: () => Promise<{ success: boolean; message: string }>) => { const result = await action(); setMessage({ text: result.success ? (result.message.includes("reactiv") ? "Acceso reactivado correctamente" : result.message.includes("bloque") ? "Acceso bloqueado correctamente" : result.message) : result.message, success: result.success }); if (result.success) window.setTimeout(() => window.location.reload(), 1400); };
  return <span className="row-access-actions">{blocked ? <button className="row-action" title="Reactivar acceso" onClick={() => void run(() => toggleMemberAccessAction(memberId, true))}><CheckCircle2 size={13} /> Reactivar</button> : <button className="row-action" title="Bloquear acceso" onClick={() => void run(() => toggleMemberAccessAction(memberId, false))}><Ban size={13} /> Bloquear</button>}{deletable && <button className="row-action danger-action" title="Eliminar definitivamente" onClick={() => { if (window.confirm("¿Eliminar este socio definitivamente?")) void run(() => deleteMemberIfUnusedAction(memberId)); }}><Trash2 size={13} /> Eliminar</button>}{message && <span className={`action-toast ${message.success ? "success" : "error"}`} role="status">{message.text}</span>}</span>;
}
