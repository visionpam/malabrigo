"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]!)); }

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
  let content = escapeHtml(template.content);
  for (const [key, value] of Object.entries(replacements)) content = content.replaceAll(`{{${key}}}`, `<strong>${escapeHtml(value)}</strong>`);
  content = content.replaceAll("\n", "<br>");
  const fileName = `${sale.code}-${randomUUID()}.html`;
  const relativeUrl = `/generated-contracts/${fileName}`;
  const directory = path.join(process.cwd(), "public", "generated-contracts");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(template.name)}</title><style>body{font:16px/1.65 Arial,sans-serif;max-width:820px;margin:48px auto;padding:0 30px;color:#17212b}h1{color:#05263d;border-bottom:2px solid #d6a342;padding-bottom:16px}.meta{color:#5a6770}</style></head><body><h1>${escapeHtml(template.name)}</h1><p class="meta">${escapeHtml(template.code)} · versión ${template.version}</p><div>${content}</div></body></html>`);
  const contract = await db.contract.create({ data: { saleId: sale.id, templateId: template.id, status: "GENERATED", documentUrl: relativeUrl, generatedAt: new Date() } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_GENERATED", entityType: "Contract", entityId: contract.id, after: { saleId: sale.id, templateId: template.id, documentUrl: relativeUrl } } });
  revalidatePath("/contratos"); revalidatePath("/mi-portal/contratos");
  return { success: true, message: "Contrato generado correctamente." };
}

export async function updateContractAction(contractId: string, _previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requirePermission("CONTRACTS");
  const status = z.enum(["GENERATED", "SENT", "SIGNED", "VOIDED"]).safeParse(formData.get("status"));
  if (!status.success) return { success: false, message: "Selecciona un estado válido." };
  const contract = await db.contract.findUnique({ where: { id: contractId }, select: { id: true, documentUrl: true, saleId: true } });
  if (!contract) return { success: false, message: "El contrato no existe." };
  let documentUrl = contract.documentUrl;
  const file = formData.get("signedFile");
  if (file instanceof File && file.size) {
    if (file.type !== "application/pdf" || file.size > 12 * 1024 * 1024) return { success: false, message: "El contrato firmado debe ser PDF y pesar máximo 12 MB." };
    const fileName = `${randomUUID()}.pdf`; const directory = path.join(process.cwd(), "public", "uploads", "signed-contracts");
    await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, fileName), Buffer.from(await file.arrayBuffer())); documentUrl = `/uploads/signed-contracts/${fileName}`;
  }
  if (status.data === "SIGNED" && !documentUrl) return { success: false, message: "Adjunta el contrato firmado antes de marcarlo como firmado." };
  await db.contract.update({ where: { id: contractId }, data: { status: status.data, documentUrl, signedAt: status.data === "SIGNED" ? new Date() : undefined } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "CONTRACT_STATUS_UPDATED", entityType: "Contract", entityId: contractId, after: { status: status.data, documentUrl } } });
  revalidatePath("/contratos"); revalidatePath("/mi-portal/contratos");
  return { success: true, message: "Contrato actualizado." };
}
