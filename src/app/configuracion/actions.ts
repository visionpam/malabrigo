"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";

const nullableInteger = z.union([z.number().int().min(0), z.null()]);
const planSchema = z.object({
  id: z.string().uuid().optional(),
  termMonths: z.number().int().min(1).max(120),
  downPayment: z.number().min(0),
  financedAmount: z.number().min(0),
  monthlyPayment: z.number().min(0),
  sharesGranted: nullableInteger,
  stayDaysGranted: nullableInteger,
  active: z.boolean(),
});

const programSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre").max(120),
  cashPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
  separation: z.coerce.number().min(0, "La separación no puede ser negativa"),
  cashShares: z.string().transform((value) => value ? Number(value) : null).pipe(nullableInteger),
  cashStayDays: z.string().transform((value) => value ? Number(value) : null).pipe(nullableInteger),
  beneficiaryCap: z.coerce.number().int().min(0),
  holderCap: z.coerce.number().int().min(1, "Debe permitir al menos un titular"),
  marriedHolderCap: z.coerce.number().int().min(2, "La sociedad conyugal requiere al menos dos titulares"),
  marriedBeneficiaryCap: z.coerce.number().int().min(0),
  membershipName: z.string().trim().max(160),
  shareholderCategory: z.string().trim().max(80),
  observations: z.string().trim().max(500),
  active: z.string().transform((value) => value === "true"),
  plansJson: z.string().transform((value, context) => {
    try { return JSON.parse(value) as unknown; } catch { context.addIssue({ code: "custom", message: "Los planes no son válidos" }); return z.NEVER; }
  }).pipe(z.array(planSchema)),
});

export type ProgramState = { success: boolean; message: string };
export type RankState = { success: boolean; message: string };

const rankSchema = z.object({
  name: z.string().trim().min(2).max(60),
  memberCount: z.coerce.number().int().min(1),
  directCount: z.coerce.number().int().min(0),
  directPoints: z.coerce.number().int().min(0),
  totalPoints: z.coerce.number().int().min(0),
  deadlineMonths: z.coerce.number().int().min(1),
  monthlyBonus: z.coerce.number().min(0),
  rewardName: z.string().trim().max(140),
  rewardDescription: z.string().trim().max(400),
  logoUrl: z.string().trim().max(500),
});

export async function updateRankAction(rankCode: string, _previous: RankState, formData: FormData): Promise<RankState> {
  const actor = await requirePermission("SETTINGS");
  const parsed = rankSchema.safeParse({ name: formData.get("name"), memberCount: formData.get("memberCount"), directCount: formData.get("directCount"), directPoints: formData.get("directPoints"), totalPoints: formData.get("totalPoints"), deadlineMonths: formData.get("deadlineMonths"), monthlyBonus: formData.get("monthlyBonus"), rewardName: formData.get("rewardName") ?? "", rewardDescription: formData.get("rewardDescription") ?? "", logoUrl: formData.get("logoUrl") ?? "" });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del rango." };
  const current = await db.rankDefinition.findUnique({ where: { code: rankCode } });
  if (!current) return { success: false, message: "El rango ya no existe." };
  const data = parsed.data;
  const logoFile = formData.get("logoFile");
  let uploadedLogoUrl = data.logoUrl || null;
  let destination = "";
  if (logoFile instanceof File && logoFile.size) {
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[logoFile.type];
    if (!extension || logoFile.size > 10 * 1024 * 1024) return { success: false, message: "El logo debe ser JPG, PNG o WebP y pesar máximo 10 MB." };
    const fileName = `${randomUUID()}.${extension}`;
    const directory = path.join(process.cwd(), "public", "uploads", "rank-logos");
    destination = path.join(directory, fileName);
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(destination, Buffer.from(await logoFile.arrayBuffer()));
      uploadedLogoUrl = `/uploads/rank-logos/${fileName}`;
    } catch {
      return { success: false, message: "No fue posible guardar la imagen del logo." };
    }
  }
  try {
    await db.$transaction(async (tx) => {
      await tx.rankDefinition.update({ where: { code: rankCode }, data: { ...data, rewardName: data.rewardName || null, rewardDescription: data.rewardDescription || null, logoUrl: uploadedLogoUrl } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "RANK_UPDATED", entityType: "RankDefinition", entityId: rankCode, before: { name: current.name, logoUrl: current.logoUrl }, after: { ...data, logoUrl: uploadedLogoUrl } } });
    });
  } catch {
    if (destination) await unlink(destination).catch(() => undefined);
    return { success: false, message: "No fue posible actualizar el rango." };
  }
  revalidatePath("/configuracion"); revalidatePath("/embajadores"); revalidatePath("/mi-red");
  return { success: true, message: "Rango actualizado correctamente." };
}

export async function updateProgramAction(programId: string, _previous: ProgramState, formData: FormData): Promise<ProgramState> {
  const actor = await requirePermission("SETTINGS");
  if (!z.string().uuid().safeParse(programId).success) return { success: false, message: "Programa inválido." };
  const parsed = programSchema.safeParse({
    name: formData.get("name"), cashPrice: formData.get("cashPrice"), separation: formData.get("separation"),
    cashShares: formData.get("cashShares") ?? "", cashStayDays: formData.get("cashStayDays") ?? "",
    beneficiaryCap: formData.get("beneficiaryCap"), holderCap: formData.get("holderCap"), marriedHolderCap: formData.get("marriedHolderCap"), marriedBeneficiaryCap: formData.get("marriedBeneficiaryCap"),
    membershipName: formData.get("membershipName") ?? "", shareholderCategory: formData.get("shareholderCategory") ?? "", observations: formData.get("observations") ?? "",
    active: formData.get("active") ?? "false", plansJson: formData.get("plansJson"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del programa." };
  const data = parsed.data;
  if (new Set(data.plansJson.map((plan) => plan.termMonths)).size !== data.plansJson.length) return { success: false, message: "No puede haber dos planes con el mismo número de meses." };

  const current = await db.program.findUnique({ where: { id: programId }, include: { financingPlans: true } });
  if (!current) return { success: false, message: "El programa ya no existe." };
  const assignedSales = await db.sale.findMany({ where: { programId, status: { not: "CANCELLED" } }, select: { code: true, ownershipType: true, beneficiaries: { select: { isHolder: true } } } });
  const overCapacity = assignedSales.find((sale) => {
    const holders = 1 + sale.beneficiaries.filter((person) => person.isHolder).length;
    const beneficiaries = sale.beneficiaries.filter((person) => !person.isHolder).length;
    return sale.ownershipType === "MARRIED" ? holders > data.marriedHolderCap || beneficiaries > data.marriedBeneficiaryCap : holders > data.holderCap || beneficiaries > data.beneficiaryCap;
  });
  if (overCapacity) return { success: false, message: `El nuevo cupo dejaría sin capacidad a la venta ${overCapacity.code}. Revisa sus asignaciones primero.` };
  const validPlanIds = new Set(current.financingPlans.map((plan) => plan.id));
  if (data.plansJson.some((plan) => plan.id && !validPlanIds.has(plan.id))) return { success: false, message: "Uno de los planes no pertenece al programa." };
  if (data.plansJson.some((plan) => plan.id && current.financingPlans.find((currentPlan) => currentPlan.id === plan.id)?.termMonths !== plan.termMonths)) return { success: false, message: "El plazo de un plan existente no se puede cambiar. Desactívalo y agrega uno nuevo." };

  try {
    await db.$transaction(async (transaction) => {
      await transaction.program.update({ where: { id: programId }, data: { name: data.name, cashPrice: data.cashPrice, separation: data.separation, cashShares: data.cashShares, cashStayDays: data.cashStayDays, beneficiaryCap: data.beneficiaryCap, holderCap: data.holderCap, marriedHolderCap: data.marriedHolderCap, marriedBeneficiaryCap: data.marriedBeneficiaryCap, membershipName: data.membershipName || null, shareholderCategory: data.shareholderCategory || null, observations: data.observations || null, active: data.active } });
      for (const plan of data.plansJson) {
        const values = { termMonths: plan.termMonths, downPayment: plan.downPayment, financedAmount: plan.financedAmount, monthlyPayment: plan.monthlyPayment, sharesGranted: plan.sharesGranted, stayDaysGranted: plan.stayDaysGranted, active: plan.active };
        if (plan.id) await transaction.financingPlan.update({ where: { id: plan.id }, data: values });
        else await transaction.financingPlan.create({ data: { programId, ...values } });
      }
      await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "PROGRAM_UPDATED", entityType: "Program", entityId: programId, before: { name: current.name, cashPrice: current.cashPrice.toString(), active: current.active }, after: { name: data.name, cashPrice: data.cashPrice, active: data.active, plans: data.plansJson.length } } });
    });
  } catch {
    return { success: false, message: "No fue posible actualizar el programa. Revisa que los plazos no estén repetidos." };
  }
  revalidatePath("/configuracion");
  revalidatePath("/ventas");
  return { success: true, message: "Programa actualizado correctamente." };
}
