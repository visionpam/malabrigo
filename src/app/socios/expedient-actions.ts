"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";

export type ExpedientState = { success: boolean; message: string };
const documentSchema = z.object({ title: z.string().trim().min(3).max(180), category: z.enum(["IDENTITY", "SEPARATION_FORM", "SEPARATION_PROOF", "SALE_PROOF", "SIGNED_CONTRACT", "ANNEX", "OTHER"]), saleId: z.string().uuid().or(z.literal("")) });
const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

export async function uploadMemberDocumentAction(memberId: string, _previous: ExpedientState, formData: FormData): Promise<ExpedientState> {
  const actor = await requirePermission("MEMBERS");
  const parsed = documentSchema.safeParse({ title: formData.get("title"), category: formData.get("category"), saleId: formData.get("saleId") ?? "" });
  if (!parsed.success) return { success: false, message: "Revisa el título, tipo y venta del documento." };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { success: false, message: "Selecciona un archivo." };
  if (!allowedTypes[file.type]) return { success: false, message: "El archivo debe ser JPG, PNG o PDF." };
  if (file.size > 12 * 1024 * 1024) return { success: false, message: "El archivo no puede superar 12 MB." };
  const member = await db.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) return { success: false, message: "El socio no existe." };
  if (parsed.data.saleId && !(await db.sale.findFirst({ where: { id: parsed.data.saleId, memberId }, select: { id: true } }))) return { success: false, message: "La venta no pertenece al socio." };
  const fileName = `${randomUUID()}.${allowedTypes[file.type]}`;
  const relativeUrl = `/uploads/member-documents/${fileName}`;
  const directory = path.join(process.cwd(), "public", "uploads", "member-documents");
  const destination = path.join(directory, fileName);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(destination, Buffer.from(await file.arrayBuffer()));
    const document = await db.documentRecord.create({ data: { memberId, saleId: parsed.data.saleId || null, uploadedById: actor.id, category: parsed.data.category, title: parsed.data.title, url: relativeUrl, status: "APPROVED", reviewedAt: new Date(), visibility: "PRIVATE_MEMBER" } });
    await db.auditLog.create({ data: { actorUserId: actor.id, action: "MEMBER_DOCUMENT_UPLOADED", entityType: "DocumentRecord", entityId: document.id, after: { memberId, category: document.category, title: document.title } } });
  } catch {
    await unlink(destination).catch(() => undefined);
    return { success: false, message: "No fue posible guardar el documento." };
  }
  revalidatePath("/socios"); revalidatePath("/mi-portal");
  return { success: true, message: "Documento agregado al expediente." };
}

export async function reviewMemberDocumentAction(documentId: string, status: "APPROVED" | "REJECTED", formData: FormData) {
  const actor = await requirePermission("MEMBERS");
  const document = await db.documentRecord.findUnique({ where: { id: documentId }, select: { id: true, memberId: true, status: true } });
  if (!document?.memberId || document.status !== "PENDING") return;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (status === "REJECTED" && reason.length < 3) return;
  await db.documentRecord.update({ where: { id: documentId }, data: { status, rejectionReason: status === "REJECTED" ? reason : null, reviewedAt: new Date() } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: `MEMBER_DOCUMENT_${status}`, entityType: "DocumentRecord", entityId: documentId, after: { status, reason: reason || null } } });
  revalidatePath("/socios"); revalidatePath("/mi-portal/documentos");
}
