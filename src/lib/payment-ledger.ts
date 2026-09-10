import type { Prisma } from "@/generated/prisma/client";

export async function reconcileInstallments(transaction: Prisma.TransactionClient, saleId: string) {
  const [installments, payments] = await Promise.all([
    transaction.installment.findMany({ where: { saleId }, orderBy: { number: "asc" } }),
    transaction.payment.findMany({ where: { saleId, status: "CONFIRMED", concept: "INSTALLMENT" }, orderBy: [{ paidAt: "asc" }, { confirmedAt: "asc" }] }),
  ]);
  await transaction.paymentAllocation.deleteMany({ where: { installment: { saleId } } });
  for (const installment of installments) await transaction.installment.update({ where: { id: installment.id }, data: { paidAmount: 0, status: "PENDING" } });

  const balances = installments.map((item) => ({ ...item, remaining: Number(item.amount) }));
  for (const payment of payments) {
    let available = Number(payment.amount);
    for (const installment of balances) {
      if (available <= 0) break;
      if (installment.remaining <= 0) continue;
      const allocated = Math.min(available, installment.remaining);
      await transaction.paymentAllocation.create({ data: { paymentId: payment.id, installmentId: installment.id, amount: allocated } });
      installment.remaining -= allocated;
      available -= allocated;
    }
  }
  for (const installment of balances) {
    const paidAmount = Number(installment.amount) - installment.remaining;
    const overdue = installment.dueDate < new Date() && paidAmount < Number(installment.amount);
    await transaction.installment.update({ where: { id: installment.id }, data: { paidAmount, status: paidAmount >= Number(installment.amount) ? "PAID" : overdue ? "OVERDUE" : "PENDING" } });
  }
}

export async function reconcileSaleReservation(transaction: Prisma.TransactionClient, saleId: string) {
  const sale = await transaction.sale.findUnique({ where: { id: saleId }, include: { payments: { where: { status: "CONFIRMED", concept: "SEPARATION" } }, member: true } });
  if (!sale || sale.status === "CANCELLED" || sale.status === "COMPLETED") return;
  const separationPaid = sale.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  const covered = separationPaid >= Number(sale.separationAmount);
  if (!covered && sale.status === "RESERVED") await transaction.sale.update({ where: { id: saleId }, data: { status: "DRAFT" } });
  if (covered && sale.status === "DRAFT") await transaction.sale.update({ where: { id: saleId }, data: { status: "RESERVED" } });
  if (!covered && sale.status === "ACTIVE") {
    await transaction.sale.update({ where: { id: saleId }, data: { status: "RESERVED", signedAt: null } });
    const otherActive = await transaction.sale.count({ where: { memberId: sale.memberId, status: "ACTIVE", id: { not: saleId } } });
    if (otherActive === 0) {
      await transaction.member.update({ where: { id: sale.memberId }, data: { status: "PROSPECT", joinedAt: null } });
      await transaction.investorProfile.updateMany({ where: { memberId: sale.memberId }, data: { status: "PROSPECT", activatedAt: null } });
    }
  }
}
