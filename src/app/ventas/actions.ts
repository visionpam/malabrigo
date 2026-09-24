"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { reconcileDirectCommission } from "@/lib/commission-ledger";
import { requirePermission } from "@/lib/access-control";

const databaseId = z.string().trim().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Selecciona una opción válida",
);

const saleSchema = z.discriminatedUnion("mode", [
  z.object({
    memberId: databaseId,
    programId: databaseId,
    mode: z.literal("CASH"),
    financingPlanId: z.literal(""),
  }),
  z.object({
    memberId: databaseId,
    programId: databaseId,
    mode: z.literal("CREDIT"),
    financingPlanId: databaseId,
  }),
]);

type SaleFields = "memberId" | "programId" | "mode" | "financingPlanId";

export type CreateSaleState = {
  success: boolean;
  message: string;
  code?: string;
  errors?: Partial<Record<SaleFields, string[]>>;
};

function installmentDate(monthOffset: number) {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + monthOffset;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(today.getUTCDate(), lastDay)));
}

export async function createSaleAction(_previousState: CreateSaleState, formData: FormData): Promise<CreateSaleState> {
  await requirePermission("SALES");
  const parsed = saleSchema.safeParse({
    memberId: formData.get("memberId"),
    programId: formData.get("programId"),
    mode: formData.get("mode"),
    financingPlanId: formData.get("financingPlanId") ?? "",
  });

  if (!parsed.success) {
    return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  }

  const input = parsed.data;
  const [member, program] = await Promise.all([
    db.member.findUnique({ where: { id: input.memberId }, select: { id: true, investorProfile: { select: { id: true } } } }),
    db.program.findFirst({ where: { id: input.programId, active: true }, include: { financingPlans: { where: { active: true } } } }),
  ]);

  if (!member) return { success: false, message: "El socio seleccionado ya no está disponible." };
  if (!member.investorProfile) return { success: false, message: "La persona seleccionada no tiene perfil de inversionista." };
  if (!program) return { success: false, message: "El programa seleccionado ya no está disponible." };

  const financingPlan = input.mode === "CREDIT"
    ? program.financingPlans.find((plan) => plan.id === input.financingPlanId)
    : null;

  if (input.mode === "CREDIT" && !financingPlan) {
    return { success: false, message: "El plan no pertenece al programa seleccionado o ya no está vigente." };
  }

  const code = `VTA-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

  try {
    await db.$transaction(async (transaction) => {
      const sale = await transaction.sale.create({
        data: {
          code,
          memberId: member.id,
          programId: program.id,
          financingPlanId: financingPlan?.id ?? null,
          mode: input.mode,
          status: "DRAFT",
          currency: "USD",
          totalPrice: program.cashPrice,
          separationAmount: program.separation,
          downPaymentAmount: financingPlan?.downPayment ?? 0,
        },
        select: { id: true },
      });

      if (financingPlan) {
        await transaction.installment.createMany({
          data: Array.from({ length: financingPlan.termMonths }, (_, index) => ({
            saleId: sale.id,
            number: index + 1,
            amount: financingPlan.monthlyPayment,
            dueDate: installmentDate(index + 1),
          })),
        });
      }

      await transaction.auditLog.create({
        data: {
          action: "SALE_CREATED",
          entityType: "Sale",
          entityId: sale.id,
          after: {
            code,
            memberId: member.id,
            programId: program.id,
            financingPlanId: financingPlan?.id ?? null,
            mode: input.mode,
            status: "DRAFT",
            totalPrice: program.cashPrice.toString(),
          },
        },
      });
    });
  } catch {
    return { success: false, message: "No fue posible registrar la venta. Inténtalo nuevamente." };
  }

  revalidatePath("/ventas");
  return { success: true, message: "Venta registrada correctamente.", code };
}

export type SaleOperationState = { success: boolean; message: string };

export async function updateDraftSaleAction(saleId: string, _previousState: SaleOperationState, formData: FormData): Promise<SaleOperationState> {
  const actor = await requirePermission("SALES");
  const parsed = saleSchema.safeParse({ memberId: formData.get("memberId"), programId: formData.get("programId"), mode: formData.get("mode"), financingPlanId: formData.get("financingPlanId") ?? "" });
  if (!parsed.success) return { success: false, message: "Revisa el socio, programa y modalidad seleccionados." };
  const current = await db.sale.findUnique({ where: { id: saleId }, include: { payments: true, paymentSubmissions: true, documents: true, contracts: true, beneficiaries: true } });
  if (!current) return { success: false, message: "La venta ya no existe." };
  if (current.status !== "DRAFT") return { success: false, message: "Solo los borradores se pueden editar desde esta lista." };
  if (current.payments.length || current.paymentSubmissions.length || current.documents.length || current.contracts.length || current.beneficiaries.length) return { success: false, message: "El borrador tiene movimientos o personas asignadas y no puede modificarse." };
  const input = parsed.data;
  const [member, program] = await Promise.all([
    db.member.findUnique({ where: { id: input.memberId }, select: { id: true, investorProfile: { select: { id: true } } } }),
    db.program.findFirst({ where: { id: input.programId, active: true }, include: { financingPlans: { where: { active: true } } } }),
  ]);
  if (!member?.investorProfile) return { success: false, message: "El socio seleccionado no tiene perfil de inversionista activo." };
  if (!program) return { success: false, message: "El programa seleccionado ya no está disponible." };
  const financingPlan = input.mode === "CREDIT" ? program.financingPlans.find((item) => item.id === input.financingPlanId) : null;
  if (input.mode === "CREDIT" && !financingPlan) return { success: false, message: "El plazo seleccionado no pertenece al programa." };
  await db.$transaction(async (transaction) => {
    await transaction.installment.deleteMany({ where: { saleId } });
    await transaction.sale.update({ where: { id: saleId }, data: { memberId: member.id, programId: program.id, financingPlanId: financingPlan?.id ?? null, mode: input.mode, totalPrice: program.cashPrice, separationAmount: program.separation, downPaymentAmount: financingPlan?.downPayment ?? 0 } });
    if (financingPlan) await transaction.installment.createMany({ data: Array.from({ length: financingPlan.termMonths }, (_, index) => ({ saleId, number: index + 1, amount: financingPlan.monthlyPayment, dueDate: installmentDate(index + 1) })) });
    await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "SALE_DRAFT_UPDATED", entityType: "Sale", entityId: saleId, before: { memberId: current.memberId, programId: current.programId, mode: current.mode, financingPlanId: current.financingPlanId }, after: { memberId: member.id, programId: program.id, mode: input.mode, financingPlanId: financingPlan?.id ?? null } } });
  });
  revalidatePath("/ventas");
  return { success: true, message: "Borrador actualizado correctamente." };
}

export async function deleteDraftSaleAction(saleId: string, _previousState: SaleOperationState): Promise<SaleOperationState> {
  void _previousState;
  const actor = await requirePermission("SALES");
  const sale = await db.sale.findUnique({ where: { id: saleId }, include: { payments: true, paymentSubmissions: true, documents: true, contracts: true, beneficiaries: true, shareAllocation: true, stayAllocation: true } });
  if (!sale) return { success: false, message: "La venta ya no existe." };
  if (sale.status !== "DRAFT") return { success: false, message: "Solo los borradores sin activar se pueden eliminar." };
  if (sale.payments.length || sale.paymentSubmissions.length || sale.documents.length || sale.contracts.length || sale.beneficiaries.length || sale.shareAllocation || sale.stayAllocation) return { success: false, message: "No se puede eliminar: el borrador tiene movimientos, personas o documentos asociados." };
  await db.$transaction(async (transaction) => {
    await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "SALE_DRAFT_DELETED", entityType: "Sale", entityId: saleId, before: { code: sale.code, memberId: sale.memberId, programId: sale.programId } } });
    await transaction.installment.deleteMany({ where: { saleId } });
    await transaction.sale.delete({ where: { id: saleId } });
  });
  revalidatePath("/ventas");
  return { success: true, message: "Borrador eliminado." };
}

export async function confirmSeparationAction(saleId: string, _previousState: SaleOperationState, formData: FormData): Promise<SaleOperationState> {
  await requirePermission("SALES");
  const parsed = z.object({ reference: z.string().trim().min(3, "Ingresa la referencia").max(60, "Máximo 60 caracteres") }).safeParse({ reference: formData.get("reference") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Referencia inválida." };
  const sale = await db.sale.findUnique({ where: { id: saleId }, include: { payments: { where: { status: "CONFIRMED" } } } });
  if (!sale) return { success: false, message: "La venta ya no existe." };
  if (!['DRAFT', 'RESERVED'].includes(sale.status)) return { success: false, message: "La venta ya no admite confirmar la separación." };
  const paid = sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = Number(sale.separationAmount) - paid;
  if (remaining <= 0) return { success: false, message: "La separación ya está cubierta." };

  try {
    await db.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({ data: { saleId, reference: parsed.data.reference.toUpperCase(), amount: remaining, concept: "SEPARATION", currency: sale.currency, paidAt: new Date(), status: "CONFIRMED" } });
      await transaction.sale.update({ where: { id: saleId }, data: { status: "RESERVED" } });
      await transaction.auditLog.create({ data: { action: "SEPARATION_CONFIRMED", entityType: "Sale", entityId: saleId, before: { status: sale.status, confirmedAmount: paid }, after: { status: "RESERVED", paymentId: payment.id, reference: payment.reference, amount: remaining } } });
    });
  } catch {
    return { success: false, message: "No fue posible confirmar la separación. Verifica que la referencia no esté repetida." };
  }
  revalidatePath("/ventas"); revalidatePath("/pagos");
  return { success: true, message: "Separación confirmada. La venta quedó separada." };
}

export async function activateSaleAction(saleId: string, _previousState: SaleOperationState, formData: FormData): Promise<SaleOperationState> {
  await requirePermission("SALES");
  if (formData.get("contractConfirmed") !== "on") return { success: false, message: "Debes confirmar que el contrato fue firmado." };
  const sale = await db.sale.findUnique({ where: { id: saleId }, include: { payments: { where: { status: "CONFIRMED" } }, member: { include: { investorProfile: true } } } });
  if (!sale) return { success: false, message: "La venta ya no existe." };
  if (!sale.member.investorProfile) return { success: false, message: "Esta persona no tiene perfil de inversionista." };
  if (sale.status !== "RESERVED") return { success: false, message: "Primero debes confirmar la separación." };
  const confirmed = sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  if (confirmed < Number(sale.separationAmount)) return { success: false, message: "La separación todavía no está cubierta." };
  const activatedAt = new Date();
  await db.$transaction(async (transaction) => {
    await transaction.sale.update({ where: { id: saleId }, data: { status: "ACTIVE", signedAt: activatedAt } });
    if (sale.member.status === "PROSPECT") await transaction.member.update({ where: { id: sale.memberId }, data: { status: "ACTIVE", joinedAt: sale.member.joinedAt ?? activatedAt } });
    await transaction.investorProfile.update({ where: { memberId: sale.memberId }, data: { status: "ACTIVE", activatedAt: sale.member.investorProfile?.activatedAt ?? activatedAt } });
    await reconcileDirectCommission(transaction, saleId);
    await transaction.auditLog.create({ data: { action: "SALE_ACTIVATED", entityType: "Sale", entityId: saleId, before: { status: sale.status }, after: { status: "ACTIVE", contractConfirmed: true, signedAt: activatedAt.toISOString() } } });
    if (sale.member.status === "PROSPECT") await transaction.auditLog.create({ data: { action: "MEMBER_ACTIVATED", entityType: "Member", entityId: sale.memberId, before: { status: sale.member.status }, after: { status: "ACTIVE", sourceSaleId: saleId } } });
  });
  revalidatePath("/ventas"); revalidatePath("/socios"); revalidatePath("/");
  return { success: true, message: "Venta y socio activados correctamente." };
}
