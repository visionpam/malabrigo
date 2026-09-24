import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasPermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const mimeTypes: Record<string, string> = { jpg: "image/jpeg", png: "image/png", pdf: "application/pdf" };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Comprobante no encontrado", { status: 404 });
  const submission = await db.paymentSubmission.findUnique({ where: { id }, select: { voucherData: true, voucherMimeType: true, voucherUrl: true, sale: { select: { memberId: true } } } });
  if (!submission) return new Response("Comprobante no encontrado", { status: 404 });
  if (!hasPermission(user, "PAYMENTS") && !hasPermission(user, "SALES") && user.member?.id !== submission.sale.memberId) return new Response("Sin acceso", { status: 403 });

  let data: Uint8Array;
  let mime = submission.voucherMimeType;
  if (submission.voucherData) {
    data = new Uint8Array(submission.voucherData);
  } else {
    const match = /^\/uploads\/payment-vouchers\/([0-9a-f-]{36})\.(jpg|png|pdf)$/.exec(submission.voucherUrl);
    if (!match) return new Response("Comprobante no disponible", { status: 404 });
    try { data = new Uint8Array(await readFile(path.join(process.cwd(), "public", "uploads", "payment-vouchers", `${match[1]}.${match[2]}`))); }
    catch { return new Response("Comprobante no disponible", { status: 404 }); }
    mime = mimeTypes[match[2]];
  }
  return new Response(Uint8Array.from(data), { headers: { "Content-Type": mime ?? "application/octet-stream", "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
