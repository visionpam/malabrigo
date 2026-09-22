"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";

export type DocumentState = { success: boolean; message: string };
const schema = z.object({ title: z.string().trim().min(3).max(180), category: z.enum(["RENDER", "PROJECT", "TIMELINE", "CONSTRUCTION_PROGRESS", "CABINS", "PLANS", "CONTRACT_MODEL", "OTHER"]), visibility: z.enum(["ALL_MEMBERS", "ADMIN_ONLY"]) });
const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function uploadCompanyDocumentAction(_previous: DocumentState, formData: FormData): Promise<DocumentState> {
  const actor = await requirePermission("CONTRACTS");
  const parsed = schema.safeParse({ title: formData.get("title"), category: formData.get("category"), visibility: formData.get("visibility") });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { success: false, message: field === "title" ? "El título debe tener entre 3 y 180 caracteres." : field === "category" ? "Selecciona una categoría válida." : "Selecciona una visibilidad válida." };
  }
  const file = formData.get("file"); if (!(file instanceof File) || !file.size) return { success: false, message: "Selecciona un archivo." };
  if (!types[file.type] || file.size > 20 * 1024 * 1024) return { success: false, message: "Usa JPG, PNG, WebP o PDF de máximo 20 MB." };
  const documentId = randomUUID();
  const url = `/documentos/archivo/${documentId}`;
  try {
    const fileData = new Uint8Array(await file.arrayBuffer());
    await db.$transaction(async (tx) => {
      const document = await tx.documentRecord.create({ data: { id: documentId, title: parsed.data.title, category: parsed.data.category, visibility: parsed.data.visibility, status: "APPROVED", reviewedAt: new Date(), uploadedById: actor.id, url, fileData, fileMimeType: file.type } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "COMPANY_DOCUMENT_UPLOADED", entityType: "DocumentRecord", entityId: document.id, after: { title: document.title, category: document.category, visibility: document.visibility } } });
    }, { maxWait: 20000, timeout: 60000 });
  } catch (error) { console.error("No fue posible publicar el documento:", error); return { success: false, message: "No fue posible guardar el documento." }; }
  revalidatePath("/documentos"); revalidatePath("/mi-portal/documentos"); return { success: true, message: "Documento publicado." };
}

export async function updateCompanyDocumentAction(id: string, _previous: DocumentState, formData: FormData): Promise<DocumentState> {
  const actor = await requirePermission("CONTRACTS");
  const parsed = schema.safeParse({ title: formData.get("title"), category: formData.get("category"), visibility: formData.get("visibility") });
  if (!parsed.success) return { success: false, message: "Revisa el título, la categoría y la visibilidad." };
  const file = formData.get("file");
  const replacement = file instanceof File && file.size > 0 ? file : null;
  if (replacement && (!types[replacement.type] || replacement.size > 20 * 1024 * 1024)) return { success: false, message: "Usa JPG, PNG, WebP o PDF de máximo 20 MB." };
  try {
    const fileData = replacement ? new Uint8Array(await replacement.arrayBuffer()) : null;
    const updated = await db.$transaction(async (tx) => {
      const current = await tx.documentRecord.findFirst({ where: { id, memberId: null, status: "APPROVED" }, select: { id: true, title: true, category: true, visibility: true } });
      if (!current) return false;
      const result = await tx.documentRecord.updateMany({ where: { id, memberId: null, status: "APPROVED" }, data: { ...parsed.data, ...(replacement && fileData ? { fileData, fileMimeType: replacement.type, url: `/documentos/archivo/${id}` } : {}) } });
      if (!result.count) return false;
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "COMPANY_DOCUMENT_UPDATED", entityType: "DocumentRecord", entityId: id, before: current, after: { ...parsed.data, fileReplaced: Boolean(replacement) } } });
      return true;
    }, { maxWait: 20000, timeout: 60000 });
    if (!updated) return { success: false, message: "El documento ya no está disponible para editar." };
  } catch (error) { console.error("No fue posible actualizar el documento:", error); return { success: false, message: "No fue posible actualizar el documento." }; }
  revalidatePath("/documentos"); revalidatePath("/mi-portal/documentos");
  return { success: true, message: "Documento actualizado." };
}

export async function voidCompanyDocumentAction(id: string, _previous: DocumentState, formData: FormData): Promise<DocumentState> {
  const actor = await requirePermission("CONTRACTS");
  const reason = z.string().trim().min(8).max(500).safeParse(formData.get("reason"));
  if (!reason.success) return { success: false, message: "Escribe un motivo de 8 a 500 caracteres." };
  try {
    const voided = await db.$transaction(async (tx) => {
      const result = await tx.documentRecord.updateMany({ where: { id, memberId: null, status: "APPROVED" }, data: { status: "VOIDED", voidReason: reason.data, voidedAt: new Date() } });
      if (!result.count) return false;
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "COMPANY_DOCUMENT_VOIDED", entityType: "DocumentRecord", entityId: id, after: { status: "VOIDED", reason: reason.data } } });
      return true;
    });
    if (!voided) return { success: false, message: "El documento ya fue anulado o no está disponible." };
  } catch (error) { console.error("No fue posible anular el documento:", error); return { success: false, message: "No fue posible anular el documento." }; }
  revalidatePath("/documentos"); revalidatePath("/mi-portal/documentos");
  return { success: true, message: "Documento anulado. Ya no es visible para los socios." };
}
