"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";
import { recalculateAllAmbassadors, reconcileDirectCommission } from "@/lib/commission-ledger";

export async function recalculateRanksAction() {
  const actor = await requirePermission("AMBASSADORS");
  await db.$transaction(async (transaction) => { const sales = await transaction.sale.findMany({ where: { status: { in: ["ACTIVE", "COMPLETED"] } }, select: { id: true } }); for (const sale of sales) await reconcileDirectCommission(transaction, sale.id); await recalculateAllAmbassadors(transaction); await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "NETWORK_LEDGER_RECALCULATED", entityType: "AmbassadorProfile", entityId: "ALL", after: { sales: sales.length } } }); });
  revalidatePath("/embajadores"); revalidatePath("/mi-red"); revalidatePath("/reportes");
}

export async function updateCommissionStatusAction(id: string, status: "APPROVED" | "PAID" | "REVERSED") {
  const actor = await requirePermission("AMBASSADORS");
  const current = await db.commissionEntry.findUnique({ where: { id } }); if (!current) return;
  await db.commissionEntry.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "COMMISSION_STATUS_UPDATED", entityType: "CommissionEntry", entityId: id, before: { status: current.status }, after: { status } } });
  revalidatePath("/embajadores"); revalidatePath("/mi-red"); revalidatePath("/reportes");
}

export async function updateRankBonusStatusAction(id: string, status: "APPROVED" | "PAID" | "REVERSED") {
  const actor = await requirePermission("AMBASSADORS");
  const current = await db.rankBonusPayment.findUnique({ where: { id } }); if (!current) return;
  await db.rankBonusPayment.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "RANK_BONUS_STATUS_UPDATED", entityType: "RankBonusPayment", entityId: id, before: { status: current.status }, after: { status } } });
  revalidatePath("/embajadores"); revalidatePath("/mi-red"); revalidatePath("/reportes");
}

export async function deliverRankAwardAction(id: string) {
  const actor = await requirePermission("AMBASSADORS");
  const award = await db.rankAward.findUnique({ where: { id } }); if (!award || award.deliveredAt) return;
  await db.rankAward.update({ where: { id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: "RANK_AWARD_DELIVERED", entityType: "RankAward", entityId: id, after: { status: "DELIVERED" } } });
  revalidatePath("/embajadores"); revalidatePath("/mi-red");
}
