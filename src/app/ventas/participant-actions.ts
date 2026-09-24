"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";

export type ParticipantState = { success: boolean; message: string };
const personSchema = z.object({
  fullName: z.string().trim().min(3, "Ingresa el nombre completo").max(180),
  document: z.string().trim().min(3, "Ingresa el documento").max(60),
  relationship: z.string().trim().min(2, "Ingresa el parentesco").max(60),
});

function revalidateParticipants() {
  revalidatePath("/ventas");
  revalidatePath("/mi-portal");
  revalidatePath("/socios");
}

export async function setOwnershipTypeAction(saleId: string, _previous: ParticipantState, formData: FormData): Promise<ParticipantState> {
  const actor = await requirePermission("SALES");
  const parsed = z.enum(["SINGLE", "MARRIED"]).safeParse(formData.get("ownershipType"));
  if (!parsed.success) return { success: false, message: "Selecciona la modalidad de titulares." };
  const sale = await db.sale.findUnique({ where: { id: saleId }, include: { program: true, beneficiaries: true } });
  if (!sale || sale.status === "CANCELLED") return { success: false, message: "La venta no está disponible." };
  const holders = sale.beneficiaries.filter((item) => item.isHolder).length + 1;
  const beneficiaries = sale.beneficiaries.filter((item) => !item.isHolder).length;
  const holderCap = parsed.data === "MARRIED" ? sale.program.marriedHolderCap : sale.program.holderCap;
  const beneficiaryCap = parsed.data === "MARRIED" ? sale.program.marriedBeneficiaryCap : sale.program.beneficiaryCap;
  if (holders > holderCap || beneficiaries > beneficiaryCap) return { success: false, message: "Esta modalidad tiene menos cupos que las personas asignadas. Revisa las asignaciones antes de cambiarla." };
  await db.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: saleId }, data: { ownershipType: parsed.data } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: "SALE_OWNERSHIP_UPDATED", entityType: "Sale", entityId: saleId, before: { ownershipType: sale.ownershipType }, after: { ownershipType: parsed.data } } });
  });
  revalidateParticipants();
  return { success: true, message: "Modalidad de titulares actualizada." };
}

export async function addSaleParticipantAction(saleId: string, isHolder: boolean, _previous: ParticipantState, formData: FormData): Promise<ParticipantState> {
  const actor = await requirePermission("SALES");
  const parsed = personSchema.safeParse({ fullName: formData.get("fullName"), document: formData.get("document"), relationship: formData.get("relationship") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la persona." };
  try {
    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { program: true, beneficiaries: true, member: { select: { documentNumber: true } } } });
      if (!sale || sale.status === "CANCELLED") return { success: false, message: "La venta no está disponible." };
      const cap = isHolder ? (sale.ownershipType === "MARRIED" ? sale.program.marriedHolderCap : sale.program.holderCap) : (sale.ownershipType === "MARRIED" ? sale.program.marriedBeneficiaryCap : sale.program.beneficiaryCap);
      const used = sale.beneficiaries.filter((item) => item.isHolder === isHolder).length + (isHolder ? 1 : 0);
      if (used >= cap) return { success: false, message: "Se alcanzó el cupo de " + (isHolder ? "titulares" : "beneficiarios") + " de este programa." };
      if (parsed.data.document === sale.member.documentNumber || sale.beneficiaries.some((item) => item.document === parsed.data.document)) return { success: false, message: "Este documento ya está asignado a la venta." };
      const spouse = isHolder && sale.ownershipType === "MARRIED" && used === 1;
      const person = await tx.beneficiary.create({ data: { saleId, memberId: sale.memberId, isHolder, isSpouse: spouse, fullName: parsed.data.fullName, document: parsed.data.document, relationship: spouse ? "Cónyuge" : parsed.data.relationship } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: isHolder ? "SALE_HOLDER_ADDED" : "SALE_BENEFICIARY_ADDED", entityType: "Sale", entityId: saleId, after: { personId: person.id, ...parsed.data, isHolder } } });
      return { success: true, message: isHolder ? "Titular agregado a este programa." : "Beneficiario agregado a este programa." };
    }, { isolationLevel: "Serializable" });
    if (result.success) revalidateParticipants();
    return result;
  } catch {
    return { success: false, message: "No fue posible agregar la persona. Inténtalo de nuevo." };
  }
}

export async function removeSaleParticipantAction(saleId: string, personId: string) {
  const actor = await requirePermission("SALES");
  const person = await db.beneficiary.findFirst({ where: { id: personId, saleId }, include: { sale: { select: { status: true } } } });
  if (!person || person.sale.status === "CANCELLED") return;
  await db.$transaction(async (tx) => {
    await tx.dossierDocument.updateMany({ where: { beneficiaryId: personId, status: { in: ["REQUESTED", "REJECTED", "PENDING"] } }, data: { status: "CANCELLED" } });
    await tx.beneficiary.delete({ where: { id: personId } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: person.isHolder ? "SALE_HOLDER_REMOVED" : "SALE_BENEFICIARY_REMOVED", entityType: "Sale", entityId: saleId, before: { personId, fullName: person.fullName, isHolder: person.isHolder } } });
  });
  revalidateParticipants();
  revalidatePath("/mi-portal/documentos");
}
