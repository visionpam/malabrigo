import { requireUser } from "@/lib/access-control";
import { formatDate } from "@/lib/format";
import { getInvestorPaymentStatement } from "@/lib/investor-payment-statement";

function csvCell(value: string | number) {
  const plain = String(value).replace(/[\r\n\t]+/g, " ");
  const safe = /^[\s]*[=+\-@]/.test(plain) ? `'${plain}` : plain;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await requireUser();
  if (!user.member) return new Response("Perfil no disponible", { status: 403 });

  const statement = await getInvestorPaymentStatement(user.member.id);
  const header = ["Proyecto", "Programa", "Venta", "Concepto", "Monto USD", "Fecha de pago", "Seguimiento", "Fecha de envío", "Observación"];
  const lines = [header.map(csvCell).join(",")];
  for (const row of statement.paymentRows) lines.push([
    row.project, row.program, row.code, row.concept, row.amount.toFixed(2),
    row.paidAt ? formatDate(row.paidAt) : "", row.status,
    row.submittedAt ? formatDate(row.submittedAt) : "", row.rejectionReason ?? "",
  ].map(csvCell).join(","));

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=seguimiento-pagos.csv",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
