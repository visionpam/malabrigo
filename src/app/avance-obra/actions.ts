"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";

export type ConstructionState = { success: boolean; message: string };
const stageSchema = z.object({ name: z.string().trim().min(3).max(160), description: z.string().trim().max(1500), weight: z.coerce.number().positive().max(100), startsAt: z.string().date().or(z.literal("")), endsAt: z.string().date().or(z.literal("")) });
const updateSchema = z.object({ stageId: z.string().uuid(), title: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(3000), progress: z.coerce.number().min(0).max(100), occurredAt: z.string().date(), altText: z.string().trim().max(220) });
const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function createProjectStageAction(_previous: ConstructionState, formData: FormData): Promise<ConstructionState> {
  const actor = await requirePermission("CONSTRUCTION");
  const parsed = stageSchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "", weight: formData.get("weight"), startsAt: formData.get("startsAt") ?? "", endsAt: formData.get("endsAt") ?? "" });
  if (!parsed.success) return { success: false, message: "Completa el nombre, peso y fechas válidas de la etapa." };
  if (parsed.data.startsAt && parsed.data.endsAt && parsed.data.endsAt < parsed.data.startsAt) return { success: false, message: "La fecha final no puede ser anterior a la inicial." };
  const [weight, last] = await Promise.all([db.projectStage.aggregate({ _sum: { weight: true } }), db.projectStage.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } })]);
  if (Number(weight._sum.weight ?? 0) + parsed.data.weight > 100) return { success: false, message: "La suma de los pesos del proyecto no puede superar 100%." };
  const stage = await db.projectStage.create({ data: { name: parsed.data.name, description: parsed.data.description || null, weight: parsed.data.weight, startsAt: parsed.data.startsAt ? new Date(`${parsed.data.startsAt}T00:00:00Z`) : null, endsAt: parsed.data.endsAt ? new Date(`${parsed.data.endsAt}T00:00:00Z`) : null, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "PROJECT_STAGE_CREATED", entityType: "ProjectStage", entityId: stage.id, after: { name: stage.name, weight: parsed.data.weight } } });
  revalidatePath("/avance-obra"); revalidatePath("/mi-portal/avance-obra");
  return { success: true, message: "Etapa creada." };
}

export async function publishProjectUpdateAction(_previous: ConstructionState, formData: FormData): Promise<ConstructionState> {
  const actor = await requirePermission("CONSTRUCTION");
  const parsed = updateSchema.safeParse({ stageId: formData.get("stageId"), title: formData.get("title"), description: formData.get("description"), progress: formData.get("progress"), occurredAt: formData.get("occurredAt"), altText: formData.get("altText") ?? "" });
  if (!parsed.success) return { success: false, message: "Completa la etapa, título, descripción, avance y fecha." };
  const stage = await db.projectStage.findUnique({ where: { id: parsed.data.stageId }, include: { updates: { orderBy: { occurredAt: "desc" }, take: 1 } } });
  if (!stage) return { success: false, message: "La etapa ya no existe." };
  if (parsed.data.progress < Number(stage.updates[0]?.progress ?? 0)) return { success: false, message: "El avance no puede ser menor que la última publicación." };
  const file = formData.get("media"); let fileInfo: { url: string; altText: string } | null = null; let destination = "";
  if (file instanceof File && file.size) {
    if (!allowedTypes[file.type] || file.size > 12 * 1024 * 1024) return { success: false, message: "La evidencia debe ser JPG, PNG, WebP o PDF y pesar máximo 12 MB." };
    const fileName = `${randomUUID()}.${allowedTypes[file.type]}`; const directory = path.join(process.cwd(), "public", "uploads", "construction"); destination = path.join(directory, fileName);
    await mkdir(directory, { recursive: true }); await writeFile(destination, Buffer.from(await file.arrayBuffer())); fileInfo = { url: `/uploads/construction/${fileName}`, altText: parsed.data.altText || parsed.data.title };
  }
  try {
    const update = await db.projectUpdate.create({ data: { stageId: stage.id, title: parsed.data.title, description: parsed.data.description, progress: parsed.data.progress, occurredAt: new Date(`${parsed.data.occurredAt}T00:00:00Z`), publishedAt: new Date(), media: fileInfo ? { create: { url: fileInfo.url, altText: fileInfo.altText, sortOrder: 1 } } : undefined } });
    await db.auditLog.create({ data: { actorUserId: actor.id, action: "PROJECT_UPDATE_PUBLISHED", entityType: "ProjectUpdate", entityId: update.id, after: { stageId: stage.id, progress: parsed.data.progress, title: parsed.data.title } } });
  } catch { if (destination) await unlink(destination).catch(() => undefined); return { success: false, message: "No fue posible publicar la actualización." }; }
  revalidatePath("/"); revalidatePath("/avance-obra"); revalidatePath("/mi-portal/avance-obra");
  return { success: true, message: "Avance publicado para los socios." };
}
