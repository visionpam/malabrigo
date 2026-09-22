"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";

export type ProjectState = { success: boolean; message: string };
const schema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40).regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000),
});

function refresh() {
  revalidatePath("/proyectos"); revalidatePath("/avance-obra"); revalidatePath("/mi-portal/avance-obra"); revalidatePath("/"); revalidatePath("/reportes");
}

export async function saveConstructionProjectAction(id: string | null, _previous: ProjectState, formData: FormData): Promise<ProjectState> {
  const actor = await requirePermission("CONSTRUCTION");
  const parsed = schema.safeParse({ code: formData.get("code"), name: formData.get("name"), description: formData.get("description") ?? "" });
  if (!parsed.success) return { success: false, message: "Revisa el código (letras, números o guiones), el nombre y la descripción." };
  try {
    const data = { code: parsed.data.code, name: parsed.data.name, description: parsed.data.description || null };
    await db.$transaction(async (tx) => {
      const current = id ? await tx.constructionProject.findUnique({ where: { id }, select: { code: true, name: true, description: true, active: true } }) : null;
      if (id && !current) throw new Error("PROJECT_NOT_FOUND");
      const project = id ? await tx.constructionProject.update({ where: { id }, data }) : await tx.constructionProject.create({ data });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: id ? "CONSTRUCTION_PROJECT_UPDATED" : "CONSTRUCTION_PROJECT_CREATED", entityType: "ConstructionProject", entityId: project.id, before: current ?? undefined, after: { ...data, active: project.active } } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") return { success: false, message: "El proyecto ya no existe." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { success: false, message: "Ya existe un proyecto con ese código." };
    console.error("No fue posible guardar el proyecto:", error);
    return { success: false, message: "No fue posible guardar el proyecto." };
  }
  refresh(); return { success: true, message: id ? "Proyecto actualizado." : "Proyecto creado. Ya puedes registrar sus etapas." };
}

export async function setConstructionProjectActiveAction(id: string, active: boolean, _previous: ProjectState): Promise<ProjectState> {
  void _previous;
  const actor = await requirePermission("CONSTRUCTION");
  try {
    const changed = await db.$transaction(async (tx) => {
      const result = await tx.constructionProject.updateMany({ where: { id, active: !active }, data: { active } });
      if (!result.count) return false;
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: active ? "CONSTRUCTION_PROJECT_ACTIVATED" : "CONSTRUCTION_PROJECT_DEACTIVATED", entityType: "ConstructionProject", entityId: id, after: { active } } });
      return true;
    });
    if (!changed) return { success: false, message: "El estado del proyecto ya cambió. Actualiza la página." };
  } catch (error) { console.error("No fue posible cambiar el proyecto:", error); return { success: false, message: "No fue posible cambiar el estado." }; }
  refresh(); return { success: true, message: active ? "Proyecto activado." : "Proyecto inactivado; sus avances ya no se muestran a los socios." };
}
