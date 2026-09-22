"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";

export type ConstructionState = { success: boolean; message: string; field?: string };
const stageSchema = z.object({ projectId: z.string().uuid(), name: z.string().trim().min(3).max(160), description: z.string().trim().max(1500), weight: z.coerce.number().positive().max(100), startsAt: z.string().date().or(z.literal("")), endsAt: z.string().date().or(z.literal("")) });
const updateSchema = z.object({ stageId: z.string().uuid(), title: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(3000), progress: z.coerce.number().min(0).max(100), occurredAt: z.string().date(), altText: z.string().trim().max(220) });
const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function createProjectStageAction(projectId: string, _previous: ConstructionState, formData: FormData): Promise<ConstructionState> {
  const actor = await requirePermission("CONSTRUCTION");
  const parsed = stageSchema.safeParse({ projectId, name: formData.get("name"), description: formData.get("description") ?? "", weight: formData.get("weight"), startsAt: formData.get("startsAt") ?? "", endsAt: formData.get("endsAt") ?? "" });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const messages: Record<string, string> = { projectId: "Selecciona un proyecto válido.", name: "El nombre de la etapa debe tener entre 3 y 160 caracteres.", description: "La descripción de la etapa puede tener máximo 1500 caracteres.", weight: "El peso debe ser mayor que 0 y no superar 100%.", startsAt: "Selecciona una fecha inicial válida.", endsAt: "Selecciona una fecha final válida." };
    return { success: false, field, message: messages[field] ?? "Revisa los datos de la etapa." };
  }
  if (parsed.data.startsAt && parsed.data.endsAt && parsed.data.endsAt < parsed.data.startsAt) return { success: false, message: "La fecha final no puede ser anterior a la inicial." };
  const project = await db.constructionProject.findUnique({ where: { id: parsed.data.projectId }, select: { active: true } });
  if (!project?.active) return { success: false, message: "Selecciona un proyecto activo." };
  const [weight, last] = await Promise.all([db.projectStage.aggregate({ where: { projectId: parsed.data.projectId }, _sum: { weight: true } }), db.projectStage.findFirst({ where: { projectId: parsed.data.projectId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } })]);
  if (Number(weight._sum.weight ?? 0) + parsed.data.weight > 100) return { success: false, message: "La suma de los pesos del proyecto no puede superar 100%." };
  const stage = await db.projectStage.create({ data: { projectId: parsed.data.projectId, name: parsed.data.name, description: parsed.data.description || null, weight: parsed.data.weight, startsAt: parsed.data.startsAt ? new Date(`${parsed.data.startsAt}T00:00:00Z`) : null, endsAt: parsed.data.endsAt ? new Date(`${parsed.data.endsAt}T00:00:00Z`) : null, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "PROJECT_STAGE_CREATED", entityType: "ProjectStage", entityId: stage.id, after: { projectId: stage.projectId, name: stage.name, weight: parsed.data.weight } } });
  revalidatePath("/avance-obra"); revalidatePath("/mi-portal/avance-obra");
  return { success: true, message: "Etapa creada." };
}

export async function publishProjectUpdateAction(_previous: ConstructionState, formData: FormData): Promise<ConstructionState> {
  const actor = await requirePermission("CONSTRUCTION");
  const parsed = updateSchema.safeParse({ stageId: formData.get("stageId"), title: formData.get("title"), description: formData.get("description"), progress: formData.get("progress"), occurredAt: formData.get("occurredAt"), altText: formData.get("altText") ?? "" });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const messages: Record<string, string> = { stageId: "Selecciona una etapa válida.", title: "El título debe tener entre 3 y 180 caracteres.", description: "La descripción del avance debe tener entre 10 y 3000 caracteres.", progress: "El avance debe ser un número entre 0 y 100.", occurredAt: "Selecciona una fecha válida para el avance.", altText: "La descripción de la evidencia puede tener máximo 220 caracteres." };
    return { success: false, field, message: messages[field] ?? "Revisa los datos del avance." };
  }
  const stage = await db.projectStage.findUnique({ where: { id: parsed.data.stageId }, include: { project: { select: { active: true } }, updates: { orderBy: { occurredAt: "desc" }, take: 1 } } });
  if (!stage?.project.active) return { success: false, message: "La etapa o el proyecto ya no está activo." };
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
