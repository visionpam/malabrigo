"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";

export type ContractState = { success: boolean; message: string };
const templateSchema = z.object({ code: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9_-]+$/), name: z.string().trim().min(3).max(160), content: z.string().trim().min(40) });
const generationSchema = z.object({ saleId: z.string().uuid(), templateId: z.string().uuid() });

export async function createContractTemplateAction(_previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requirePermission("CONTRACTS");
  const parsed = templateSchema.safeParse({ code: formData.get("code"), name: formData.get("name"), content: formData.get("content") });
  if (!parsed.success) return { success: false, message: "Completa código, nombre y contenido de la plantilla." };
  const code = parsed.data.code.toUpperCase();
  const latest = await db.contractTemplate.findFirst({ where: { code }, orderBy: { version: "desc" }, select: { version: true } });
  const template = await db.contractTemplate.create({ data: { ...parsed.data, code, version: (latest?.version ?? 0) + 1 } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_TEMPLATE_CREATED", entityType: "ContractTemplate", entityId: template.id, after: { code, name: template.name, version: template.version } } });
  revalidatePath("/contratos");
  return { success: true, message: `Plantilla ${template.name} v${template.version} creada.` };
}

export async function updateContractTemplateAction(templateId: string, _previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requirePermission("CONTRACTS");
  const id = z.string().uuid().safeParse(templateId);
  const parsed = templateSchema.safeParse({ code: formData.get("code"), name: formData.get("name"), content: formData.get("content") });
  if (!id.success || !parsed.success) return { success: false, message: "Revisa el código, nombre y contenido de la plantilla." };
  const code = parsed.data.code.toUpperCase();
  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.contractTemplate.findUnique({ where: { id: templateId }, include: { _count: { select: { contracts: true } } } });
      if (!existing) return { success: false, message: "La plantilla ya no existe." };
      if (existing._count.contracts && code !== existing.code) return { success: false, message: "El código de una plantilla usada no puede cambiar. Crea otra plantilla para un código nuevo." };
      if (existing._count.contracts) {
        const latest = await tx.contractTemplate.findFirst({ where: { code }, orderBy: { version: "desc" }, select: { version: true } });
        const next = await tx.contractTemplate.create({ data: { code, name: parsed.data.name, content: parsed.data.content, version: (latest?.version ?? existing.version) + 1 } });
        await tx.contractTemplate.updateMany({ where: { code, id: { not: next.id } }, data: { active: false } });
        await tx.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_TEMPLATE_VERSIONED", entityType: "ContractTemplate", entityId: next.id, after: { previousId: existing.id, code, version: next.version } } });
        return { success: true, message: `Se creó ${next.name} v${next.version}; la versión anterior se conserva para los contratos existentes.` };
      }
      const updated = await tx.contractTemplate.update({ where: { id: templateId }, data: { code, name: parsed.data.name, content: parsed.data.content } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_TEMPLATE_UPDATED", entityType: "ContractTemplate", entityId: updated.id, after: { code, name: updated.name, version: updated.version } } });
      return { success: true, message: "Plantilla actualizada." };
    }, { maxWait: 20000, timeout: 30000 });
    if (result.success) revalidatePath("/contratos");
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "Ya existe una plantilla con ese código y versión." };
    return { success: false, message: "No fue posible actualizar la plantilla." };
  }
}

export async function deleteContractTemplateAction(templateId: string, _previous: ContractState): Promise<ContractState> {
  void _previous;
  const actor = await requirePermission("CONTRACTS");
  if (!z.string().uuid().safeParse(templateId).success) return { success: false, message: "Plantilla inválida." };
  try {
    const result = await db.$transaction(async (tx) => {
      const template = await tx.contractTemplate.findUnique({ where: { id: templateId }, select: { code: true, version: true, _count: { select: { contracts: true } } } });
      if (!template) return { success: false, message: "La plantilla ya no existe." };
      if (template._count.contracts) return { success: false, message: "No se puede eliminar: esta plantilla ya está asociada a contratos." };
      await tx.contractTemplate.delete({ where: { id: templateId } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_TEMPLATE_DELETED", entityType: "ContractTemplate", entityId: templateId, before: { code: template.code, version: template.version } } });
      return { success: true, message: "Plantilla eliminada." };
    }, { maxWait: 20000, timeout: 30000 });
    if (result.success) revalidatePath("/contratos");
    return result;
  } catch {
    return { success: false, message: "No fue posible eliminarla. Comprueba si ya está vinculada a un contrato." };
  }
}

export async function generateContractAction(_previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requirePermission("CONTRACTS");
  const parsed = generationSchema.safeParse({ saleId: formData.get("saleId"), templateId: formData.get("templateId") });
  if (!parsed.success) return { success: false, message: "Selecciona una venta y una plantilla." };
  const [sale, template] = await Promise.all([
    db.sale.findFirst({ where: { id: parsed.data.saleId, status: { not: "CANCELLED" } }, include: { member: true, program: true, financingPlan: true } }),
    db.contractTemplate.findFirst({ where: { id: parsed.data.templateId, active: true } }),
  ]);
  if (!sale || !template) return { success: false, message: "La venta o plantilla ya no está disponible." };
  const replacements: Record<string, string> = { NOMBRE_SOCIO: `${sale.member.firstName} ${sale.member.lastName}`, DOCUMENTO: `${sale.member.documentType} ${sale.member.documentNumber}`, CODIGO_SOCIO: sale.member.memberCode, CODIGO_VENTA: sale.code, PROGRAMA: sale.program.name, VALOR: `USD ${Number(sale.totalPrice).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, MODALIDAD: sale.mode === "CASH" ? "Contado" : `Crédito a ${sale.financingPlan?.termMonths ?? 0} meses`, FECHA: new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(new Date()) };
  let documentText = template.content;
  for (const [key, value] of Object.entries(replacements)) documentText = documentText.replaceAll(`{{${key}}}`, value);
  const contractId = randomUUID();
  const documentUrl = `/contratos/archivo/${contractId}`;
  const contract = await db.contract.create({ data: { id: contractId, saleId: sale.id, templateId: template.id, status: "GENERATED", documentUrl, documentText, generatedAt: new Date() } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_GENERATED", entityType: "Contract", entityId: contract.id, after: { saleId: sale.id, templateId: template.id, documentUrl } } });
  revalidatePath("/contratos"); revalidatePath("/mi-portal/contratos");
  return { success: true, message: "Contrato generado correctamente." };
}

export async function updateContractAction(contractId: string, _previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requirePermission("CONTRACTS");
  const status = z.enum(["GENERATED", "SENT", "SIGNED"]).safeParse(formData.get("status"));
  if (!status.success) return { success: false, message: "Selecciona un estado válido." };
  const contract = await db.contract.findUnique({ where: { id: contractId }, select: { id: true, documentUrl: true, saleId: true, status: true } });
  if (!contract) return { success: false, message: "El contrato no existe." };
  if (contract.status === "VOIDED") return { success: false, message: "Un contrato anulado no puede modificarse ni reactivarse." };
  let documentUrl = contract.documentUrl;
  const file = formData.get("signedFile");
  if (file instanceof File && file.size) {
    if (file.type !== "application/pdf" || file.size > 12 * 1024 * 1024) return { success: false, message: "El contrato firmado debe ser PDF y pesar máximo 12 MB." };
    const fileName = `${randomUUID()}.pdf`; const directory = path.join(process.cwd(), "public", "uploads", "signed-contracts");
    await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, fileName), Buffer.from(await file.arrayBuffer())); documentUrl = `/uploads/signed-contracts/${fileName}`;
  }
  if (status.data === "SIGNED" && !documentUrl) return { success: false, message: "Adjunta el contrato firmado antes de marcarlo como firmado." };
  const updated = await db.contract.updateMany({ where: { id: contractId, status: { not: "VOIDED" } }, data: { status: status.data, documentUrl, signedAt: status.data === "SIGNED" ? new Date() : undefined } });
  if (!updated.count) return { success: false, message: "El contrato fue anulado por otro usuario y no puede modificarse." };
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_STATUS_UPDATED", entityType: "Contract", entityId: contractId, after: { status: status.data, documentUrl } } });
  revalidatePath("/contratos"); revalidatePath("/mi-portal/contratos");
  return { success: true, message: "Contrato actualizado." };
}

export async function voidContractAction(contractId: string, _previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requirePermission("CONTRACTS");
  if (!z.string().uuid().safeParse(contractId).success) return { success: false, message: "Contrato inválido." };
  const reason = z.string().trim().min(8, "Explica el motivo con al menos 8 caracteres.").max(500, "El motivo no puede superar 500 caracteres.").safeParse(formData.get("reason"));
  if (!reason.success) return { success: false, message: reason.error.issues[0]?.message ?? "Indica el motivo de anulación." };
  try {
    const result = await db.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id: contractId }, select: { status: true } });
      if (!contract) return { success: false, message: "El contrato ya no existe." };
      if (contract.status === "VOIDED") return { success: false, message: "Este contrato ya está anulado." };
      const updated = await tx.contract.updateMany({ where: { id: contractId, status: { not: "VOIDED" } }, data: { status: "VOIDED" } });
      if (!updated.count) return { success: false, message: "Este contrato ya está anulado." };
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_VOIDED", entityType: "Contract", entityId: contractId, before: { status: contract.status }, after: { status: "VOIDED", reason: reason.data } } });
      return { success: true, message: "Contrato anulado correctamente." };
    }, { maxWait: 20000, timeout: 30000 });
    if (result.success) { revalidatePath("/contratos"); revalidatePath("/mi-portal/contratos"); }
    return result;
  } catch {
    return { success: false, message: "No fue posible anular el contrato. Inténtalo nuevamente." };
  }
}
