"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";
import { PAYMENT_CONCEPT_VALUES } from "@/lib/payment-concepts";

const submissionSchema = z.object({ saleId: z.string().uuid(), concept: z.enum(PAYMENT_CONCEPT_VALUES, "Selecciona el concepto del pago"), amount: z.coerce.number().positive("El monto debe ser mayor que cero").max(999999999) });
const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
export type SubmissionState = { success: boolean; message: string };

export async function submitOwnPaymentAction(_previous: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const user = await requireUser();
  if (!user.member) return { success: false, message: "Tu cuenta no tiene un perfil de socio." };
  const parsed = submissionSchema.safeParse({ saleId: formData.get("saleId"), concept: formData.get("concept"), amount: formData.get("amount") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del pago." };
  const voucher = formData.get("voucher");
  if (!(voucher instanceof File) || voucher.size === 0) return { success: false, message: "Adjunta el comprobante del pago." };
  if (!allowedTypes[voucher.type]) return { success: false, message: "El comprobante debe ser una imagen JPG, PNG o un archivo PDF." };
  if (voucher.size > 8 * 1024 * 1024) return { success: false, message: "El comprobante no puede superar 8 MB." };
  const sale = await db.sale.findFirst({ where: { id: parsed.data.saleId, memberId: user.member.id, status: { not: "CANCELLED" } }, select: { id: true, currency: true } });
  if (!sale) return { success: false, message: "La inversión seleccionada no está disponible." };

  const fileName = `${randomUUID()}.${allowedTypes[voucher.type]}`;
  const relativeUrl = `/uploads/payment-vouchers/${fileName}`;
  const directory = path.join(process.cwd(), "public", "uploads", "payment-vouchers");
  const destination = path.join(directory, fileName);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(destination, Buffer.from(await voucher.arrayBuffer()));
    const submission = await db.paymentSubmission.create({ data: { saleId: sale.id, amount: parsed.data.amount, concept: parsed.data.concept, currency: sale.currency, voucherUrl: relativeUrl } });
    await db.auditLog.create({ data: { actorUserId: user.id, action: "PAYMENT_SUBMITTED", entityType: "PaymentSubmission", entityId: submission.id, after: { saleId: sale.id, amount: parsed.data.amount, concept: parsed.data.concept, voucherUrl: relativeUrl, status: "PENDING" } } });
  } catch {
    await unlink(destination).catch(() => undefined);
    return { success: false, message: "No fue posible enviar el comprobante." };
  }
  revalidatePath("/mi-portal/pagos");
  revalidatePath("/pagos");
  return { success: true, message: "Comprobante enviado. El pago quedó pendiente de aprobación." };
}
