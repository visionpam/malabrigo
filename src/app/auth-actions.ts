"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSecureToken, hashPassword, tokenHash, validatePassword, verifyPassword } from "@/lib/account-security";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email";
import { createSession, getCurrentUser, revokeCurrentSession } from "@/lib/session";
import { defaultRoute } from "@/lib/access-control";

export type AuthState = { success: boolean; message: string };
const passwordSchema = z.object({ password: z.string().min(10), confirmation: z.string() }).refine((data) => data.password === data.confirmation, { message: "Las contraseñas no coinciden." });

export async function activateAccountAction(token: string, _state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Contraseña inválida." };
  if (!validatePassword(parsed.data.password)) return { success: false, message: "Usa al menos 10 caracteres, una letra, un número y un símbolo." };
  const invitation = await db.accountInvitation.findFirst({ where: { tokenHash: tokenHash(token), consumedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
  if (!invitation) return { success: false, message: "La invitación es inválida o ha vencido." };
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: invitation.userId }, data: { passwordHash, status: "ACTIVE" } });
    await transaction.accountInvitation.updateMany({ where: { userId: invitation.userId, consumedAt: null }, data: { consumedAt: new Date() } });
    await transaction.auditLog.create({ data: { action: "ACCOUNT_ACTIVATED", entityType: "User", entityId: invitation.userId, after: { status: "ACTIVE" } } });
  });
  await createSession(invitation.userId); redirect("/");
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = String(formData.get("identifier") ?? "").trim(); const password = String(formData.get("password") ?? "");
  const user = await db.user.findFirst({ where: { OR: [{ email: identifier.toLowerCase() }, { member: { memberCode: identifier } }] }, include: { member: { include: { investorProfile: true, ambassadorProfile: true } }, roles: { include: { role: true } }, permissions: { include: { permission: true } } } });
  if (!user?.passwordHash || user.status !== "ACTIVE" || !await verifyPassword(password, user.passwordHash)) return { success: false, message: "Credenciales incorrectas." };
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }); await createSession(user.id);
  redirect(defaultRoute(user));
}

export async function logoutAction() {
  await revokeCurrentSession();
  redirect("/iniciar-sesion");
}

export async function changePasswordAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser(); if (!user?.passwordHash) return { success: false, message: "Debes iniciar sesión." };
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!await verifyPassword(currentPassword, user.passwordHash)) return { success: false, message: "La contraseña actual es incorrecta." };
  if (!parsed.success || !validatePassword(parsed.data.password)) return { success: false, message: parsed.success ? "La nueva contraseña no cumple los requisitos." : parsed.error.issues[0]?.message ?? "Contraseña inválida." };
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (transaction) => { await transaction.user.update({ where: { id: user.id }, data: { passwordHash } }); await transaction.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }); await transaction.auditLog.create({ data: { action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id } }); });
  await revokeCurrentSession(); await createSession(user.id); return { success: true, message: "Contraseña actualizada. Las demás sesiones fueron cerradas." };
}

export async function requestPasswordResetAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase(); const user = await db.user.findUnique({ where: { email } });
  if (user) { const token = createSecureToken(); await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 3600000) } }); await sendPasswordReset({ email: user.email, name: user.displayName, token }); }
  return { success: true, message: "Si el correo está registrado, recibirás un enlace para continuar." };
}

export async function resetPasswordAction(token: string, _state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!parsed.success || !validatePassword(parsed.data.password)) return { success: false, message: parsed.success ? "La contraseña no cumple los requisitos." : parsed.error.issues[0]?.message ?? "Contraseña inválida." };
  const reset = await db.passwordResetToken.findFirst({ where: { tokenHash: tokenHash(token), consumedAt: null, expiresAt: { gt: new Date() } } }); if (!reset) return { success: false, message: "El enlace es inválido o ha vencido." };
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (transaction) => { await transaction.user.update({ where: { id: reset.userId }, data: { passwordHash, status: "ACTIVE" } }); await transaction.passwordResetToken.updateMany({ where: { userId: reset.userId, consumedAt: null }, data: { consumedAt: new Date() } }); await transaction.userSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }); await transaction.auditLog.create({ data: { action: "PASSWORD_RESET", entityType: "User", entityId: reset.userId } }); });
  await createSession(reset.userId); redirect("/");
}
