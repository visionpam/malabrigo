import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export type PermissionCode = "DASHBOARD" | "MEMBERS" | "AMBASSADORS" | "SALES" | "PAYMENTS" | "CONTRACTS" | "CONSTRUCTION" | "REPORTS" | "SETTINGS" | "ADMIN_USERS";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/iniciar-sesion");
  return user;
}

export function roleCodes(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return user.roles.map((entry) => entry.role.code);
}

export function hasPermission(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, permission: PermissionCode) {
  const roles = roleCodes(user);
  return roles.includes("SUPERADMIN") || user.permissions.some((entry) => entry.permission.code === permission);
}

export async function requirePermission(permission: PermissionCode) {
  const user = await requireUser();
  if (!hasPermission(user, permission)) redirect(defaultRoute(user));
  return user;
}

export function defaultRoute(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const roles = roleCodes(user);
  if (roles.includes("SUPERADMIN") || user.permissions.some((entry) => entry.permission.code === "DASHBOARD")) return "/";
  if (roles.includes("AMBASSADOR")) return "/mi-red";
  if (roles.includes("MEMBER")) return "/mi-portal";
  const first = user.permissions[0]?.permission.code;
  return ({ MEMBERS: "/socios", AMBASSADORS: "/embajadores", SALES: "/ventas", PAYMENTS: "/pagos", CONTRACTS: "/contratos", CONSTRUCTION: "/avance-obra", REPORTS: "/reportes", SETTINGS: "/configuracion", ADMIN_USERS: "/administracion/usuarios" } as Record<string, string>)[first ?? ""] ?? "/sin-acceso";
}
