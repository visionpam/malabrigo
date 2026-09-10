"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
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
  if (!parsed.success) return { success: false, message: "Completa el título, categoría y visibilidad." };
  const file = formData.get("file"); if (!(file instanceof File) || !file.size) return { success: false, message: "Selecciona un archivo." };
  if (!types[file.type] || file.size > 20 * 1024 * 1024) return { success: false, message: "Usa JPG, PNG, WebP o PDF de máximo 20 MB." };
  const fileName = `${randomUUID()}.${types[file.type]}`; const directory = path.join(process.cwd(), "public", "uploads", "company-documents"); const destination = path.join(directory, fileName);
  try { await mkdir(directory, { recursive: true }); await writeFile(destination, Buffer.from(await file.arrayBuffer())); const document = await db.documentRecord.create({ data: { title: parsed.data.title, category: parsed.data.category, visibility: parsed.data.visibility, status: "APPROVED", reviewedAt: new Date(), uploadedById: actor.id, url: `/uploads/company-documents/${fileName}` } }); await db.auditLog.create({ data: { actorUserId: actor.id, action: "COMPANY_DOCUMENT_UPLOADED", entityType: "DocumentRecord", entityId: document.id, after: { title: document.title, category: document.category, visibility: document.visibility } } }); }
  catch { await unlink(destination).catch(() => undefined); return { success: false, message: "No fue posible guardar el documento." }; }
  revalidatePath("/documentos"); revalidatePath("/mi-portal/documentos"); return { success: true, message: "Documento publicado." };
}
