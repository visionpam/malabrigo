"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { reconcileDirectCommission } from "@/lib/commission-ledger";
import { reconcileInstallments, reconcileSaleReservation } from "@/lib/payment-ledger";
import { requirePermission } from "@/lib/access-control";

const idSchema = z.string().regex(/^[0-9a-f-]{36}$/i);
const paymentSchema = z.object({
  saleId: idSchema,
  reference: z.string().trim().min(3, "Ingresa una referencia").max(60, "Máximo 60 caracteres"),
  amount: z.coerce.number().positive("El monto debe ser mayor que cero").max(999999999, "Monto inválido"),
  concept: z.enum(["SEPARATION", "DOWN_PAYMENT", "INSTALLMENT", "OTHER"]),
  paidAt: z.string().date("Selecciona una fecha válida"),
});
const voucherTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

async function saveVoucher(file: File) {
  if (!voucherTypes[file.type] || file.size > 8 * 1024 * 1024 || !file.size) throw new Error("El soporte debe ser JPG, PNG o PDF de máximo 8 MB.");
  return { data: new Uint8Array(await file.arrayBuffer()), mimeType: file.type };
}

export type PaymentActionState = { success: boolean; message: string; errors?: Record<string, string[] | undefined> };
const refresh = () => { revalidatePath("/pagos"); revalidatePath("/ventas"); revalidatePath("/socios"); revalidatePath("/mi-portal/pagos"); revalidatePath("/mi-portal/reportes"); revalidatePath("/"); };

function parsePayment(formData: FormData) {
  return paymentSchema.safeParse({ saleId: formData.get("saleId"), reference: formData.get("reference"), amount: formData.get("amount"), concept: formData.get("concept"), paidAt: formData.get("paidAt") });
}

export async function createPaymentAction(_state: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const actor = await requirePermission("PAYMENTS");
  const parsed = parsePayment(formData);
  if (!parsed.success) return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  const sale = await db.sale.findUnique({ where: { id: parsed.data.saleId }, select: { id: true, status: true, currency: true } });
  if (!sale || sale.status === "CANCELLED") return { success: false, message: "La venta seleccionada no admite pagos." };
  const voucher = formData.get("voucher");
  if (!(voucher instanceof File) || !voucher.size) return { success: false, message: "Adjunta el soporte de pago antes de registrarlo." };
  if (!voucherTypes[voucher.type] || voucher.size > 8 * 1024 * 1024) return { success: false, message: "El soporte debe ser JPG, PNG o PDF de máximo 8 MB." };
  let saved: Awaited<ReturnType<typeof saveVoucher>>;
  try { saved = await saveVoucher(voucher); }
  catch { return { success: false, message: "No fue posible guardar el soporte de pago." }; }
  try {
    await db.$transaction(async (transaction) => {
      const submittedAt = new Date(`${parsed.data.paidAt}T12:00:00-05:00`);
      const submissionId = randomUUID();
      const voucherUrl = `/pagos/comprobantes/${submissionId}`;
      const submission = await transaction.paymentSubmission.create({ data: { id: submissionId, saleId: sale.id, amount: parsed.data.amount, concept: parsed.data.concept, currency: sale.currency, voucherUrl, voucherData: saved.data, voucherMimeType: saved.mimeType, status: "APPROVED", reviewedAt: new Date(), submittedAt } });
      const payment = await transaction.payment.create({ data: { ...parsed.data, submissionId: submission.id, reference: parsed.data.reference.toUpperCase(), currency: sale.currency, paidAt: submittedAt } });
      await reconcileInstallments(transaction, sale.id);
      await reconcileSaleReservation(transaction, sale.id);
      await reconcileDirectCommission(transaction, sale.id);
      await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "PAYMENT_CREATED", entityType: "Payment", entityId: payment.id, after: { saleId: sale.id, reference: payment.reference, amount: payment.amount.toString(), concept: payment.concept, paidAt: payment.paidAt.toISOString(), status: payment.status, voucherUrl } } });
    }, { maxWait: 20000, timeout: 60000 });
  } catch (error) {
    console.error("No fue posible registrar el pago:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "La referencia del pago ya está registrada." };
    return { success: false, message: "No fue posible registrar el pago." };
  }
  refresh(); return { success: true, message: "Pago registrado correctamente." };
}

export async function attachPaymentVoucherAction(paymentId: string, _state: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const actor = await requirePermission("PAYMENTS");
  if (!idSchema.safeParse(paymentId).success) return { success: false, message: "Pago inválido." };
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { submission: true } });
  if (!payment) return { success: false, message: "El pago ya no existe." };
  if (payment.submission) return { success: false, message: "Este pago ya tiene un comprobante asociado." };
  const voucher = formData.get("voucher");
  if (!(voucher instanceof File) || !voucher.size) return { success: false, message: "Selecciona el comprobante de pago." };
  if (!voucherTypes[voucher.type] || voucher.size > 8 * 1024 * 1024) return { success: false, message: "El soporte debe ser JPG, PNG o PDF de máximo 8 MB." };
  let saved: Awaited<ReturnType<typeof saveVoucher>>;
  try { saved = await saveVoucher(voucher); }
  catch { return { success: false, message: "No fue posible guardar el soporte de pago." }; }
  try {
    await db.$transaction(async (transaction) => {
      const submissionId = randomUUID();
      const voucherUrl = `/pagos/comprobantes/${submissionId}`;
      const submission = await transaction.paymentSubmission.create({ data: { id: submissionId, saleId: payment.saleId, amount: payment.amount, concept: payment.concept, currency: payment.currency, voucherUrl, voucherData: saved.data, voucherMimeType: saved.mimeType, submittedAt: payment.paidAt, reviewedAt: new Date(), status: "APPROVED" } });
      const updated = await transaction.payment.updateMany({ where: { id: paymentId, submissionId: null }, data: { submissionId: submission.id } });
      if (!updated.count) throw new Error("El pago ya tiene comprobante.");
      await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "PAYMENT_VOUCHER_ATTACHED", entityType: "Payment", entityId: paymentId, after: { submissionId: submission.id, voucherUrl } } });
    }, { maxWait: 20000, timeout: 60000 });
  } catch (error) {
    console.error("No fue posible vincular el comprobante:", error);
    return { success: false, message: "No fue posible vincular el comprobante. Actualiza la página y vuelve a intentar." };
  }
  refresh();
  return { success: true, message: "Comprobante vinculado al pago." };
}

export async function updatePaymentAction(paymentId: string, _state: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  await requirePermission("PAYMENTS");
  const parsed = parsePayment(formData);
  if (!parsed.success) return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  const current = await db.payment.findUnique({ where: { id: paymentId } });
  if (!current) return { success: false, message: "El pago ya no existe." };
  if (current.status === "VOIDED") return { success: false, message: "Un pago anulado no puede editarse." };
  const sale = await db.sale.findUnique({ where: { id: parsed.data.saleId }, select: { id: true, status: true, currency: true } });
  if (!sale || sale.status === "CANCELLED") return { success: false, message: "La venta seleccionada no admite pagos." };
  try {
    await db.$transaction(async (transaction) => {
      const updated = await transaction.payment.update({ where: { id: paymentId }, data: { ...parsed.data, reference: parsed.data.reference.toUpperCase(), currency: sale.currency, paidAt: new Date(`${parsed.data.paidAt}T12:00:00-05:00`) } });
      await reconcileInstallments(transaction, current.saleId); if (current.saleId !== sale.id) await reconcileInstallments(transaction, sale.id);
      await reconcileSaleReservation(transaction, current.saleId); if (current.saleId !== sale.id) await reconcileSaleReservation(transaction, sale.id);
      await reconcileDirectCommission(transaction, current.saleId); if (current.saleId !== sale.id) await reconcileDirectCommission(transaction, sale.id);
      await transaction.auditLog.create({ data: { action: "PAYMENT_UPDATED", entityType: "Payment", entityId: paymentId, before: { saleId: current.saleId, reference: current.reference, amount: current.amount.toString(), concept: current.concept, paidAt: current.paidAt.toISOString() }, after: { saleId: updated.saleId, reference: updated.reference, amount: updated.amount.toString(), concept: updated.concept, paidAt: updated.paidAt.toISOString() } } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "La referencia del pago ya está registrada." };
    return { success: false, message: "No fue posible actualizar el pago." };
  }
  refresh(); return { success: true, message: "Pago actualizado correctamente." };
}

export async function voidPaymentAction(paymentId: string, _state: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  await requirePermission("PAYMENTS");
  const parsed = z.object({ reason: z.string().trim().min(5, "Describe brevemente el motivo").max(300) }).safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Motivo inválido." };
  const current = await db.payment.findUnique({ where: { id: paymentId } });
  if (!current) return { success: false, message: "El pago ya no existe." };
  if (current.status === "VOIDED") return { success: false, message: "El pago ya está anulado." };
  await db.$transaction(async (transaction) => {
    await transaction.payment.update({ where: { id: paymentId }, data: { status: "VOIDED" } });
    await reconcileInstallments(transaction, current.saleId);
    await reconcileSaleReservation(transaction, current.saleId);
    await reconcileDirectCommission(transaction, current.saleId);
    await transaction.auditLog.create({ data: { action: "PAYMENT_VOIDED", entityType: "Payment", entityId: paymentId, before: { status: current.status, reference: current.reference, amount: current.amount.toString() }, after: { status: "VOIDED", reason: parsed.data.reason } } });
  });
  refresh(); return { success: true, message: "Pago anulado correctamente. El movimiento se conserva en el historial." };
}

export async function approveSubmissionAction(submissionId: string, _state: PaymentActionState): Promise<PaymentActionState> {
  void _state;
  const actor = await requirePermission("PAYMENTS");
  const submission = await db.paymentSubmission.findUnique({ where: { id: submissionId }, include: { payment: true, sale: true } });
  if (!submission) return { success: false, message: "El comprobante ya no existe." };
  if (submission.status !== "PENDING" || submission.payment) return { success: false, message: "El comprobante ya fue revisado." };
  try {
    await db.$transaction(async (transaction) => {
      const reference = `WEB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const payment = await transaction.payment.create({ data: { saleId: submission.saleId, submissionId: submission.id, reference, amount: submission.amount, concept: submission.concept, currency: submission.currency, paidAt: submission.submittedAt, status: "CONFIRMED" } });
      await transaction.paymentSubmission.update({ where: { id: submission.id }, data: { status: "APPROVED", reviewedAt: new Date(), rejectionReason: null } });
      await reconcileInstallments(transaction, submission.saleId);
      await reconcileSaleReservation(transaction, submission.saleId);
      await reconcileDirectCommission(transaction, submission.saleId);
      await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "PAYMENT_SUBMISSION_APPROVED", entityType: "PaymentSubmission", entityId: submission.id, after: { paymentId: payment.id, reference, amount: payment.amount.toString(), concept: payment.concept, status: "APPROVED" } } });
    });
  } catch { return { success: false, message: "No fue posible aprobar el comprobante." }; }
  refresh(); return { success: true, message: "Comprobante aprobado y pago aplicado." };
}

export async function rejectSubmissionAction(submissionId: string, _state: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const actor = await requirePermission("PAYMENTS");
  const parsed = z.object({ reason: z.string().trim().min(5, "Describe el motivo del rechazo").max(500) }).safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Motivo inválido." };
  const result = await db.paymentSubmission.updateMany({ where: { id: submissionId, status: "PENDING" }, data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: parsed.data.reason } });
  if (!result.count) return { success: false, message: "El comprobante ya fue revisado." };
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "PAYMENT_SUBMISSION_REJECTED", entityType: "PaymentSubmission", entityId: submissionId, after: { status: "REJECTED", reason: parsed.data.reason } } });
  refresh(); return { success: true, message: "Comprobante rechazado." };
}
