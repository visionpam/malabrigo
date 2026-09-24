"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";

export type DossierActionState = { success: boolean; message: string };
const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const uuid = z.string().uuid();
const createSchema = z.object({
  saleId: uuid,
  subject: z.string().min(1),
  category: z.enum(["IDENTITY", "SEPARATION_FORM", "SEPARATION_PROOF", "SALE_PROOF", "SIGNED_CONTRACT", "ANNEX", "OTHER"]),
  title: z.string().trim().min(3).max(180),
  mode: z.enum(["request", "upload"]),
});

function refreshDossier() {
  revalidatePath("/ventas");
  revalidatePath("/mi-portal/documentos");
  revalidatePath("/socios");
}

async function readFile(value: FormDataEntryValue | null): Promise<{ ok: false; error: string } | { ok: true; bytes: Uint8Array<ArrayBuffer>; mime: string; name: string }> {
  if (!(value instanceof File) || !value.size) return { ok: false, error: "Selecciona un archivo." };
  if (!allowedTypes.has(value.type) || value.size > 12 * 1024 * 1024) return { ok: false, error: "Usa JPG, PNG o PDF de máximo 12 MB." };
  const bytes = new Uint8Array(await value.arrayBuffer());
  const signature = value.type === "application/pdf" ? Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-" : value.type === "image/png" ? Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!signature) return { ok: false, error: "El contenido no coincide con el tipo de archivo." };
  return { ok: true, bytes, mime: value.type, name: value.name.slice(0, 180) };
}

export async function createDossierDocumentAction(_previous: DossierActionState, formData: FormData): Promise<DossierActionState> {
  const actor = await requirePermission("SALES");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Completa la venta, persona y tipo de documento." };
  const { saleId, subject, category, title, mode } = parsed.data;
  const sale = await db.sale.findUnique({ where: { id: saleId }, include: { member: true, beneficiaries: true } });
  if (!sale || sale.status === "CANCELLED") return { success: false, message: "La venta no está disponible." };
  const person = sale.beneficiaries.find((item) => item.id === subject);
  if (!person && subject !== "sale" && subject !== "primary") return { success: false, message: "La persona no pertenece a esta venta." };
  const kind = subject === "sale" ? "SALE" : subject === "primary" ? "PRIMARY_HOLDER" : person!.isHolder ? "HOLDER" : "BENEFICIARY";
  const name = subject === "sale" ? `Venta ${sale.code}` : subject === "primary" ? `${sale.member.firstName} ${sale.member.lastName}` : person!.fullName;
  const file = mode === "upload" ? await readFile(formData.get("file")) : null;
  if (file && !file.ok) return { success: false, message: file.error };
  try {
    await db.$transaction(async (tx) => {
      const row = await tx.dossierDocument.create({ data: { saleId, beneficiaryId: person?.id ?? null, subjectKind: kind, subjectName: name, category, title, status: file ? "APPROVED" : "REQUESTED", fileData: file?.bytes, fileMimeType: file?.mime, fileName: file?.name, uploadedById: file ? actor.id : null, reviewedAt: file ? new Date() : null } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: file ? "DOSSIER_DOCUMENT_UPLOADED" : "DOSSIER_DOCUMENT_REQUESTED", entityType: "DossierDocument", entityId: row.id, after: { saleId, subjectKind: kind, beneficiaryId: person?.id ?? null, title, category } } });
      return row;
    });
    refreshDossier();
    return { success: true, message: file ? "Documento cargado y aprobado." : `Solicitud creada para ${name}.` };
  } catch {
    return { success: false, message: "No fue posible guardar el documento." };
  }
}

export async function uploadRequestedDocumentAction(documentId: string, _previous: DossierActionState, formData: FormData): Promise<DossierActionState> {
  const actor = await requireUser();
  if (!actor.member) return { success: false, message: "No tienes un expediente asociado." };
  const document = await db.dossierDocument.findUnique({ where: { id: documentId }, select: { id: true, sale: { select: { memberId: true, status: true } }, status: true } });
  if (!document || document.sale.memberId !== actor.member.id || document.sale.status === "CANCELLED") return { success: false, message: "Solicitud no disponible." };
  if (document.status !== "REQUESTED" && document.status !== "REJECTED") return { success: false, message: "Esta solicitud ya fue enviada o cerrada." };
  const file = await readFile(formData.get("file"));
  if (!file.ok) return { success: false, message: file.error };
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.dossierDocument.updateMany({ where: { id: documentId, status: { in: ["REQUESTED", "REJECTED"] } }, data: { status: "PENDING", fileData: file.bytes, fileMimeType: file.mime, fileName: file.name, uploadedById: actor.id, rejectionReason: null, reviewedAt: null } });
      if (!updated.count) throw new Error("La solicitud cambió de estado.");
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "DOSSIER_DOCUMENT_SUBMITTED", entityType: "DossierDocument", entityId: documentId, after: { fileName: file.name } } });
    });
    refreshDossier();
    return { success: true, message: "Documento enviado para aprobación." };
  } catch {
    return { success: false, message: "No fue posible enviar el archivo. Actualiza la página e intenta de nuevo." };
  }
}

export async function reviewDossierDocumentAction(documentId: string, decision: "APPROVED" | "REJECTED", _previous: DossierActionState, formData: FormData): Promise<DossierActionState> {
  const actor = await requirePermission("SALES");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (decision === "REJECTED" && reason.length < 3) return { success: false, message: "Indica el motivo del rechazo (mínimo 3 caracteres)." };
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.dossierDocument.updateMany({ where: { id: documentId, status: "PENDING" }, data: { status: decision, rejectionReason: decision === "REJECTED" ? reason : null, reviewedAt: new Date() } });
      if (!updated.count) throw new Error("La solicitud cambió de estado.");
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: `DOSSIER_DOCUMENT_${decision}`, entityType: "DossierDocument", entityId: documentId, after: { decision, reason: reason || null } } });
    });
    refreshDossier();
    return { success: true, message: decision === "APPROVED" ? "Documento aprobado." : "Documento rechazado. El inversionista podrá corregirlo." };
  } catch {
    return { success: false, message: "No se pudo revisar el documento. Actualiza la página." };
  }
}

export async function uploadDossierDocumentAsAdminAction(documentId: string, _previous: DossierActionState, formData: FormData): Promise<DossierActionState> {
  const actor = await requirePermission("SALES");
  const file = await readFile(formData.get("file"));
  if (!file.ok) return { success: false, message: file.error };
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.dossierDocument.updateMany({ where: { id: documentId, status: { in: ["REQUESTED", "REJECTED"] } }, data: { status: "APPROVED", fileData: file.bytes, fileMimeType: file.mime, fileName: file.name, uploadedById: actor.id, rejectionReason: null, reviewedAt: new Date() } });
      if (!updated.count) throw new Error("La solicitud cambió de estado.");
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "DOSSIER_DOCUMENT_ADMIN_FULFILLED", entityType: "DossierDocument", entityId: documentId, after: { fileName: file.name } } });
    });
    refreshDossier();
    return { success: true, message: "Documento cargado y aprobado." };
  } catch {
    return { success: false, message: "No se pudo cargar el archivo. Actualiza la página." };
  }
}
