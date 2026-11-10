"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { canFilePqrs, canManagePqrs } from "@/lib/pqrs";

export type PqrsActionState = { success: boolean; message: string; caseId?: string };
const category = z.enum(["PETITION", "COMPLAINT", "CLAIM", "SUGGESTION"]);
const text = z.string().trim().min(10).max(5000);
const uuid = z.string().uuid();

async function attachment(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || !value.size) return null;
  if (value.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "application/pdf"].includes(value.type)) throw new Error("Adjunta JPG, PNG o PDF de máximo 8 MB.");
  const bytes = new Uint8Array(await value.arrayBuffer());
  const valid = value.type === "application/pdf" ? Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-" : value.type === "image/png" ? Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!valid) throw new Error("El contenido del archivo no coincide con su tipo.");
  return { fileData: bytes, fileName: value.name.slice(0, 180), fileMimeType: value.type };
}

function refresh() {
  revalidatePath("/pqrs");
  revalidatePath("/pqrs/administracion");
  revalidatePath("/", "layout");
}

export async function createPqrsAction(_state: PqrsActionState, form: FormData): Promise<PqrsActionState> {
  const user = await requireUser();
  if (!canFilePqrs(user)) return { success: false, message: "Tu cuenta no tiene un portal habilitado." };
  const parsed = z.object({ category, subject: z.string().trim().min(5).max(180), body: text }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { success: false, message: "Selecciona el tipo y escribe un asunto y descripción claros." };
  try {
    const file = await attachment(form.get("file"));
    const code = `PQR-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 12).toUpperCase()}`;
    const created = await db.$transaction(async (tx) => {
      const row = await tx.pqrsCase.create({ data: { code, ownerId: user.id, category: parsed.data.category, subject: parsed.data.subject, messages: { create: { authorId: user.id, body: parsed.data.body, ...file } } } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: "PQRS_FILED", entityType: "PqrsCase", entityId: row.id, after: { code, category: row.category } } });
      return row;
    });
    refresh();
    return { success: true, message: `Solicitud radicada con número ${code}.`, caseId: created.id };
  } catch (error) { return { success: false, message: error instanceof Error && (error.message.startsWith("Adjunta") || error.message.startsWith("El contenido")) ? error.message : "No fue posible radicar la solicitud." }; }
}

export async function addPqrsMessageAction(caseId: string, _state: PqrsActionState, form: FormData): Promise<PqrsActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(caseId).success) return { success: false, message: "Radicado no válido." };
  const parsed = text.safeParse(form.get("body"));
  if (!parsed.success) return { success: false, message: "Escribe un mensaje de 10 a 5000 caracteres." };
  const current = await db.pqrsCase.findUnique({ where: { id: caseId }, select: { ownerId: true, status: true } });
  const staff = canManagePqrs(user) && current?.ownerId !== user.id;
  if (!current || (!staff && (current.ownerId !== user.id || !canFilePqrs(user)))) return { success: false, message: "No tienes acceso a este radicado." };
  if (current.status === "CLOSED") return { success: false, message: "Reabre el caso antes de enviar otro mensaje." };
  try {
    const file = await attachment(form.get("file"));
    await db.$transaction(async (tx) => {
      const updated = await tx.pqrsCase.updateMany({ where: { id: caseId, status: { not: "CLOSED" } }, data: staff ? { status: "ANSWERED", lastAdminReplyAt: new Date() } : { status: "IN_REVIEW", memberSeenAt: new Date() } });
      if (!updated.count) throw new Error("El caso fue cerrado.");
      await tx.pqrsMessage.create({ data: { caseId, authorId: user.id, body: parsed.data, isStaff: staff, ...file } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: staff ? "PQRS_ANSWERED" : "PQRS_MESSAGE_SENT", entityType: "PqrsCase", entityId: caseId } });
    });
    refresh(); revalidatePath(`/pqrs/${caseId}`);
    return { success: true, message: staff ? "Respuesta enviada al usuario." : "Mensaje enviado a atención al cliente." };
  } catch (error) { return { success: false, message: error instanceof Error && (error.message.startsWith("Adjunta") || error.message.startsWith("El contenido")) ? error.message : "No se pudo enviar el mensaje." }; }
}

export async function changePqrsStatusAction(caseId: string, next: "IN_REVIEW" | "CLOSED", _state: PqrsActionState): Promise<PqrsActionState> {
  void _state;
  const user = await requireUser();
  if (!uuid.safeParse(caseId).success) return { success: false, message: "Radicado no válido." };
  const current = await db.pqrsCase.findUnique({ where: { id: caseId }, select: { ownerId: true, status: true } });
  if (!current) return { success: false, message: "Radicado no encontrado." };
  const staff = canManagePqrs(user) && current.ownerId !== user.id;
  const ownerReopening = current.ownerId === user.id && canFilePqrs(user) && current.status === "CLOSED" && next === "IN_REVIEW";
  if (!staff && !ownerReopening) return { success: false, message: "No tienes permiso para cambiar este estado." };
  if (next === "CLOSED" && current.status !== "ANSWERED") return { success: false, message: "El caso debe estar respondido antes de cerrarlo." };
  if (next === "IN_REVIEW" && current.status !== "FILED" && current.status !== "CLOSED") return { success: false, message: "No se puede realizar esta transición." };
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.pqrsCase.updateMany({ where: { id: caseId, status: current.status }, data: { status: next, ...(ownerReopening ? { memberSeenAt: new Date() } : {}) } });
      if (!updated.count) throw new Error("El estado del caso cambió. Actualiza la página.");
      await tx.auditLog.create({ data: { actorUserId: user.id, action: next === "CLOSED" ? "PQRS_CLOSED" : ownerReopening ? "PQRS_REOPENED" : "PQRS_IN_REVIEW", entityType: "PqrsCase", entityId: caseId } });
    });
  } catch { return { success: false, message: "No se pudo cambiar el estado. Actualiza la página e inténtalo de nuevo." }; }
  refresh(); revalidatePath(`/pqrs/${caseId}`);
  return { success: true, message: next === "CLOSED" ? "Caso cerrado." : ownerReopening ? "Caso reabierto." : "Caso en revisión." };
}

export async function markPqrsReadAction(caseId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(caseId).success || !canFilePqrs(user)) return;
  await db.pqrsCase.updateMany({ where: { id: caseId, ownerId: user.id }, data: { memberSeenAt: new Date() } });
  refresh(); revalidatePath(`/pqrs/${caseId}`);
}
