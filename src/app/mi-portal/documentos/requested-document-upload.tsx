"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";
import { uploadRequestedDocumentAction, type DossierActionState } from "@/app/ventas/dossier-actions";

const initial: DossierActionState = { success: false, message: "" };

export function RequestedDocumentUpload({ documentId, title }: { documentId: string; title: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(uploadRequestedDocumentAction.bind(null, documentId), initial);
  useEffect(() => { if (state.success) { formRef.current?.reset(); router.refresh(); } }, [state.success, router]);
  return <form ref={formRef} action={action} className="dossier-upload-form"><label><span>Archivo para {title}</span><input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" required /></label><button className="row-action row-action-info" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={16} /> : <Upload size={16} />}{pending ? "Enviando..." : "Enviar documento"}</button>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<small>JPG, PNG o PDF · máximo 12 MB.</small></form>;
}
