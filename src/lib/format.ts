const moneyFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" });

export function formatMoney(value: unknown) {
  return moneyFormatter.format(Number(value ?? 0));
}

export function formatDate(value: Date | null | undefined) {
  return value ? dateFormatter.format(value) : "—";
}

export const memberStatusLabel = { PROSPECT: "Prospecto", ACTIVE: "Activo", IN_ARREARS: "En mora", SUSPENDED: "Suspendido", WITHDRAWN: "Retirado" } as const;
export const saleStatusLabel = { DRAFT: "Borrador", RESERVED: "Separado", ACTIVE: "Activo", COMPLETED: "Completado", CANCELLED: "Cancelado" } as const;
export const contractStatusLabel = { DRAFT: "Borrador", GENERATED: "Generado", SENT: "Enviado", SIGNED: "Firmado", VOIDED: "Anulado" } as const;

export function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["ACTIVE", "COMPLETED", "APPROVED", "CONFIRMED", "SIGNED"].includes(status)) return "success";
  if (["PROSPECT", "DRAFT", "PENDING", "GENERATED"].includes(status)) return "warning";
  if (["CANCELLED", "REJECTED", "VOIDED", "SUSPENDED", "WITHDRAWN"].includes(status)) return "danger";
  return "info";
}
