"use server";

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
  beneficiaryCap: z.coerce.number().int().min(1, "Debe permitir al menos un beneficiario"),
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

export async function updateProgramAction(programId: string, _previous: ProgramState, formData: FormData): Promise<ProgramState> {
  const actor = await requirePermission("SETTINGS");
  if (!z.string().uuid().safeParse(programId).success) return { success: false, message: "Programa inválido." };
  const parsed = programSchema.safeParse({
    name: formData.get("name"), cashPrice: formData.get("cashPrice"), separation: formData.get("separation"),
    cashShares: formData.get("cashShares") ?? "", cashStayDays: formData.get("cashStayDays") ?? "",
    beneficiaryCap: formData.get("beneficiaryCap"), marriedBeneficiaryCap: formData.get("marriedBeneficiaryCap"),
    membershipName: formData.get("membershipName") ?? "", shareholderCategory: formData.get("shareholderCategory") ?? "", observations: formData.get("observations") ?? "",
    active: formData.get("active") ?? "false", plansJson: formData.get("plansJson"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del programa." };
  const data = parsed.data;
  if (new Set(data.plansJson.map((plan) => plan.termMonths)).size !== data.plansJson.length) return { success: false, message: "No puede haber dos planes con el mismo número de meses." };

  const current = await db.program.findUnique({ where: { id: programId }, include: { financingPlans: true } });
  if (!current) return { success: false, message: "El programa ya no existe." };
  const validPlanIds = new Set(current.financingPlans.map((plan) => plan.id));
  if (data.plansJson.some((plan) => plan.id && !validPlanIds.has(plan.id))) return { success: false, message: "Uno de los planes no pertenece al programa." };
  if (data.plansJson.some((plan) => plan.id && current.financingPlans.find((currentPlan) => currentPlan.id === plan.id)?.termMonths !== plan.termMonths)) return { success: false, message: "El plazo de un plan existente no se puede cambiar. Desactívalo y agrega uno nuevo." };

  try {
    await db.$transaction(async (transaction) => {
      await transaction.program.update({ where: { id: programId }, data: { name: data.name, cashPrice: data.cashPrice, separation: data.separation, cashShares: data.cashShares, cashStayDays: data.cashStayDays, beneficiaryCap: data.beneficiaryCap, marriedBeneficiaryCap: data.marriedBeneficiaryCap, membershipName: data.membershipName || null, shareholderCategory: data.shareholderCategory || null, observations: data.observations || null, active: data.active } });
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
