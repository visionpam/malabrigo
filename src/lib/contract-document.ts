import "server-only";
import { hasPermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function accessibleContract(id: string) {
  const user = await getCurrentUser();
  if (!user) return { status: 401 as const, contract: null };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: 404 as const, contract: null };
  const contract = await db.contract.findUnique({ where: { id }, select: { id: true, documentText: true, documentUrl: true, template: { select: { name: true, code: true, version: true } }, sale: { select: { code: true, memberId: true } } } });
  if (!contract) return { status: 404 as const, contract: null };
  if (!hasPermission(user, "CONTRACTS") && user.member?.id !== contract.sale.memberId) return { status: 403 as const, contract: null };
  return { status: 200 as const, contract };
}
