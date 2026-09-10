"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSecureToken, tokenHash } from "@/lib/account-security";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { sendAccountInvitation } from "@/lib/email";

export type AdminUserState = { success: boolean; message: string };

export async function createAdminUserAction(_state: AdminUserState, formData: FormData): Promise<AdminUserState> {
  const actor = await requirePermission("ADMIN_USERS");
  const parsed = z.object({ displayName: z.string().trim().min(3).max(160), email: z.string().trim().toLowerCase().email(), permissions: z.array(z.string()).min(1, "Selecciona al menos un permiso.") }).safeParse({ displayName: formData.get("displayName"), email: formData.get("email"), permissions: formData.getAll("permissions") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const permissionRows = await db.permission.findMany({ where: { code: { in: parsed.data.permissions } } });
  if (permissionRows.length !== parsed.data.permissions.length) return { success: false, message: "Hay permisos inválidos." };
  const token = createSecureToken();
  try {
    const user = await db.$transaction(async (transaction) => {
      const created = await transaction.user.create({ data: { displayName: parsed.data.displayName, email: parsed.data.email, status: "INVITED" } });
      const adminRole = await transaction.role.findUniqueOrThrow({ where: { code: "DIRECTION" } });
      await transaction.userRole.create({ data: { userId: created.id, roleId: adminRole.id } });
      await transaction.userPermission.createMany({ data: permissionRows.map((permission) => ({ userId: created.id, permissionId: permission.id })) });
      await transaction.accountInvitation.create({ data: { userId: created.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 86400000) } });
      await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "ADMIN_USER_CREATED", entityType: "User", entityId: created.id, after: { email: created.email, permissions: parsed.data.permissions } } });
      return created;
    });
    const delivery = await sendAccountInvitation({ email: user.email, name: user.displayName, token });
    revalidatePath("/administracion/usuarios");
    return { success: true, message: delivery.sent ? "Administrador creado e invitación enviada." : "Administrador creado. El correo SMTP todavía debe configurarse." };
  } catch {
    return { success: false, message: "No fue posible crear el usuario. Verifica que el correo no esté registrado." };
  }
}

export async function updateAdminPermissionsAction(userId: string, _state: AdminUserState, formData: FormData): Promise<AdminUserState> {
  const actor = await requirePermission("ADMIN_USERS");
  const target = await db.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!target) return { success: false, message: "El usuario ya no existe." };
  if (target.roles.some((entry) => entry.role.code === "SUPERADMIN")) return { success: false, message: "Los permisos del superadministrador no se limitan." };
  const codes = formData.getAll("permissions").map(String);
  if (!codes.length) return { success: false, message: "Selecciona al menos un permiso." };
  const rows = await db.permission.findMany({ where: { code: { in: codes } } });
  if (rows.length !== codes.length) return { success: false, message: "Hay permisos inválidos." };
  await db.$transaction(async (transaction) => {
    await transaction.userPermission.deleteMany({ where: { userId } });
    await transaction.userPermission.createMany({ data: rows.map((permission) => ({ userId, permissionId: permission.id })) });
    await transaction.auditLog.create({ data: { actorUserId: actor.id, action: "ADMIN_PERMISSIONS_UPDATED", entityType: "User", entityId: userId, after: { permissions: codes } } });
  });
  revalidatePath("/administracion/usuarios");
  return { success: true, message: "Permisos actualizados." };
}
