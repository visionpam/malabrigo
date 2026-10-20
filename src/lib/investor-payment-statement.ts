import { db } from "@/lib/db";
import { paymentConceptLabels } from "@/lib/payment-concepts";

const projectName = "Malabrigo";

export async function getInvestorPaymentStatement(memberId: string) {
  const [sales, payments, submissions] = await Promise.all([
    db.sale.findMany({ where: { memberId, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, include: { program: true, installments: { select: { id: true, status: true } } } }),
    db.payment.findMany({ where: { sale: { memberId } }, orderBy: { paidAt: "desc" }, include: { sale: { include: { program: true } }, submission: { select: { voucherUrl: true } }, allocations: { select: { installment: { select: { number: true } } } } } }),
    db.paymentSubmission.findMany({ where: { sale: { memberId } }, orderBy: { submittedAt: "desc" }, include: { sale: { include: { program: true } }, payment: { select: { id: true } } } }),
  ]);

  const confirmed = payments.filter((payment) => payment.status === "CONFIRMED");
  const contracted = sales.reduce((sum, sale) => sum + Number(sale.totalPrice), 0);
  const paid = confirmed.filter((payment) => payment.sale.status !== "CANCELLED").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const installments = sales.reduce((sum, sale) => sum + sale.installments.length, 0);
  const pendingInstallments = sales.reduce((sum, sale) => sum + sale.installments.filter((item) => item.status !== "PAID").length, 0);

  const investmentRows = sales.map((sale) => {
    const salePaid = confirmed.filter((payment) => payment.saleId === sale.id).reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { id: sale.id, code: sale.code, project: projectName, program: sale.program.name, mode: sale.mode === "CASH" ? "Contado" : "Financiado", value: Number(sale.totalPrice), paid: salePaid, balance: Math.max(0, Number(sale.totalPrice) - salePaid), installments: sale.installments.length };
  });

  const paymentRows = payments.map((payment) => {
    const installmentNumbers = [...new Set(payment.allocations.map((item) => item.installment.number))].sort((a, b) => a - b);
    const concept = payment.concept === "INSTALLMENT" && installmentNumbers.length
      ? `${installmentNumbers.length === 1 ? "Cuota" : "Cuotas"} ${installmentNumbers.join(", ")}`
      : paymentConceptLabels[payment.concept];
    return { id: `payment-${payment.id}`, project: projectName, program: payment.sale.program.name, code: payment.sale.code, concept, amount: Number(payment.amount), paidAt: payment.paidAt, submittedAt: null as Date | null, voucherUrl: payment.submission?.voucherUrl ?? null, status: payment.status === "CONFIRMED" ? "Confirmado" : "Anulado", rejectionReason: null as string | null, sortAt: payment.paidAt };
  });

  const pendingRows = submissions.filter((submission) => !submission.payment).map((submission) => ({
    id: `submission-${submission.id}`, project: projectName, program: submission.sale.program.name, code: submission.sale.code,
    concept: paymentConceptLabels[submission.concept], amount: Number(submission.amount), paidAt: null as Date | null,
    submittedAt: submission.submittedAt as Date | null, voucherUrl: submission.voucherUrl,
    status: submission.status === "REJECTED" ? "Rechazado" : submission.status === "APPROVED" ? "Aprobado" : "Pendiente", rejectionReason: submission.rejectionReason,
    sortAt: submission.submittedAt,
  }));

  return { investmentRows, paymentRows: [...paymentRows, ...pendingRows].sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime()), contracted, paid, balance: Math.max(0, contracted - paid), installments, pendingInstallments };
}
