type Installment = { status: string };

export function summarizeInstallments(installments: Installment[]) {
  const active = installments.filter((installment) => installment.status !== "CANCELLED");
  const completed = active.filter((installment) => installment.status === "PAID").length;

  return { total: active.length, completed, pending: active.length - completed };
}
