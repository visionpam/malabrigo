import "server-only";
import { cookies } from "next/headers";
import { createSecureToken, tokenHash } from "@/lib/account-security";
import { db } from "@/lib/db";

const COOKIE_NAME = "malabrigo_session";
const SESSION_DAYS = 7;

export async function createSession(userId: string) {
  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.userSession.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } });
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.userSession.findFirst({ where: { tokenHash: tokenHash(token), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE" } }, include: { user: { include: { member: { include: { investorProfile: true, ambassadorProfile: true } }, roles: { include: { role: true } }, permissions: { include: { permission: true } } } } } });
  return session?.user ?? null;
}

export async function revokeCurrentSession() {
  const store = await cookies(); const token = store.get(COOKIE_NAME)?.value;
  if (token) await db.userSession.updateMany({ where: { tokenHash: tokenHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
  store.delete(COOKIE_NAME);
}
