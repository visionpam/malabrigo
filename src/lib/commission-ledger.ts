import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

async function sponsorChain(transaction: Tx, sponsorId: string) {
  const chain: string[] = []; let current: string | null = sponsorId;
  while (current && chain.length < 8) {
    chain.push(current);
    const profile: { sponsorId: string | null } | null = await transaction.ambassadorProfile.findUnique({ where: { id: current }, select: { sponsorId: true } });
    current = profile?.sponsorId ?? null;
  }
  return chain;
}

async function collectNetwork(transaction: Tx, ambassadorId: string) {
  const root = await transaction.ambassadorProfile.findUnique({ where: { id: ambassadorId }, select: { affiliatedAt: true } });
  if (!root) return null;
  const memberIds = new Set<string>(); const directMemberIds = new Set<string>();
  let frontier = [ambassadorId];
  for (let depth = 1; depth <= 8 && frontier.length; depth++) {
    const [ambassadors, investors] = await Promise.all([
      transaction.ambassadorProfile.findMany({ where: { sponsorId: { in: frontier }, status: "ACTIVE" }, select: { id: true, memberId: true } }),
      transaction.investorProfile.findMany({ where: { sponsorId: { in: frontier }, status: { notIn: ["WITHDRAWN", "SUSPENDED"] } }, select: { memberId: true } }),
    ]);
    for (const item of [...ambassadors, ...investors]) { memberIds.add(item.memberId); if (depth === 1) directMemberIds.add(item.memberId); }
    frontier = ambassadors.map((item) => item.id);
  }
  const memberList = [...memberIds];
  const [sales, directPoints] = await Promise.all([
    memberList.length ? transaction.sale.findMany({ where: { memberId: { in: memberList }, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { totalPrice: true } }) : [],
    transaction.commissionEntry.aggregate({ where: { ambassadorId, generation: 1, status: { not: "REVERSED" } }, _sum: { points: true } }),
  ]);
  return { affiliatedAt: root.affiliatedAt, memberCount: memberIds.size, directCount: directMemberIds.size, directPoints: directPoints._sum.points ?? 0, totalVolume: sales.reduce((sum, sale) => sum + Number(sale.totalPrice), 0) };
}

export async function reconcileAmbassadorRank(transaction: Tx, ambassadorId: string) {
  const metrics = await collectNetwork(transaction, ambassadorId); if (!metrics) return;
  const [definitions, profile] = await Promise.all([
    transaction.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    transaction.ambassadorProfile.findUnique({ where: { id: ambassadorId }, select: { currentRank: true } }),
  ]);
  const currentDefinition = definitions.find((item) => item.code === profile?.currentRank);
  let achieved = currentDefinition;
  const now = new Date();
  for (const definition of definitions) {
    const deadline = new Date(metrics.affiliatedAt); deadline.setUTCMonth(deadline.getUTCMonth() + definition.deadlineMonths);
    const qualifies = now <= deadline && metrics.memberCount >= definition.memberCount && metrics.directCount >= definition.directCount && metrics.directPoints >= definition.directPoints && metrics.totalVolume >= definition.totalPoints;
    if (qualifies && (!achieved || definition.sortOrder > achieved.sortOrder)) achieved = definition;
  }
  if (achieved && achieved.code !== profile?.currentRank) {
    await transaction.ambassadorProfile.update({ where: { id: ambassadorId }, data: { currentRank: achieved.code } });
    await transaction.ambassadorRankHistory.upsert({ where: { ambassadorId_rankCode: { ambassadorId, rankCode: achieved.code } }, update: {}, create: { ambassadorId, rankCode: achieved.code, snapshot: { memberCount: metrics.memberCount, directCount: metrics.directCount, directPoints: metrics.directPoints, totalVolume: metrics.totalVolume } } });
    if (achieved.rewardName) await transaction.rankAward.upsert({ where: { ambassadorId_rankCode: { ambassadorId, rankCode: achieved.code } }, update: {}, create: { ambassadorId, rankCode: achieved.code } });
  }
  if (achieved) {
    const period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    await transaction.rankBonusPayment.upsert({ where: { ambassadorId_period: { ambassadorId, period } }, update: { rankCode: achieved.code, amount: achieved.monthlyBonus }, create: { ambassadorId, rankCode: achieved.code, period, amount: achieved.monthlyBonus } });
  }
}

export async function reconcileDirectCommission(transaction: Tx, saleId: string) {
  const sale = await transaction.sale.findUnique({ where: { id: saleId }, include: { member: { include: { investorProfile: true } }, payments: { where: { status: "CONFIRMED" }, orderBy: [{ paidAt: "asc" }, { confirmedAt: "asc" }] } } });
  if (!sale) return;
  await transaction.commissionEntry.deleteMany({ where: { sourceSaleId: saleId, generation: { gte: 1 }, status: "PENDING" } });
  const sponsorId = sale.member.investorProfile?.sponsorId;
  if (!sponsorId || !["ACTIVE", "COMPLETED"].includes(sale.status)) return;
  let accumulated = 0; let triggerPaymentId: string | null = null;
  const eligiblePayments = sale.mode === "CREDIT" ? sale.payments.filter((payment) => payment.concept === "DOWN_PAYMENT") : sale.payments;
  const threshold = sale.mode === "CREDIT" ? Number(sale.downPaymentAmount) : Number(sale.totalPrice);
  for (const payment of eligiblePayments) { accumulated += Number(payment.amount); if (accumulated >= threshold) { triggerPaymentId = payment.id; break; } }
  if (!triggerPaymentId || threshold <= 0) return;
  const [chain, directRule, levelRules] = await Promise.all([
    sponsorChain(transaction, sponsorId),
    transaction.commissionRule.findFirst({ where: { programId: sale.programId, mode: sale.mode, generation: 0, active: true }, orderBy: { version: "desc" } }),
    transaction.commissionRule.findMany({ where: { programId: null, mode: null, generation: { gte: 2, lte: 8 }, active: true }, orderBy: [{ generation: "asc" }, { version: "desc" }] }),
  ]);
  const entries: { ambassadorId: string; sourceSaleId: string; sourcePaymentId: string; generation: number; amount: number; points: number; status: "PENDING" }[] = [];
  if (chain[0] && directRule?.fixedAmount) entries.push({ ambassadorId: chain[0], sourceSaleId: sale.id, sourcePaymentId: triggerPaymentId, generation: 1, amount: Number(directRule.fixedAmount), points: directRule.points, status: "PENDING" });
  for (let generation = 2; generation <= Math.min(8, chain.length); generation++) {
    const rule = levelRules.find((item) => item.generation === generation); if (!rule?.percentage) continue;
    entries.push({ ambassadorId: chain[generation - 1], sourceSaleId: sale.id, sourcePaymentId: triggerPaymentId, generation, amount: threshold * Number(rule.percentage) / 100, points: 0, status: "PENDING" });
  }
  if (entries.length) await transaction.commissionEntry.createMany({ data: entries, skipDuplicates: true });
  for (const ambassadorId of chain) await reconcileAmbassadorRank(transaction, ambassadorId);
}

export async function recalculateAllAmbassadors(transaction: Tx) {
  const ambassadors = await transaction.ambassadorProfile.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const ambassador of ambassadors) await reconcileAmbassadorRank(transaction, ambassador.id);
}
