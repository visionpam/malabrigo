import type { PqrsCategory, PqrsStatus } from "@/generated/prisma/client";
import { hasPermission, roleCodes } from "@/lib/access-control";
import type { getCurrentUser } from "@/lib/session";

type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export const pqrsCategoryLabels: Record<PqrsCategory, string> = {
  PETITION: "Petición", COMPLAINT: "Queja", CLAIM: "Reclamo", SUGGESTION: "Sugerencia",
};
export const pqrsStatusLabels: Record<PqrsStatus, string> = {
  FILED: "Radicado", IN_REVIEW: "En revisión", ANSWERED: "Respondido", CLOSED: "Cerrado",
};

export function canManagePqrs(user: User) {
  const roles = roleCodes(user);
  return roles.includes("SUPERADMIN") || roles.includes("SUPPORT") || hasPermission(user, "ADMIN_USERS");
}

export function canFilePqrs(user: User) {
  return Boolean(user.member?.ambassadorProfile || user.member?.investorProfile);
}
