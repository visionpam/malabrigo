import { hasPermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado", { status: 404 });
  const document = await db.dossierDocument.findUnique({ where: { id }, select: { fileData: true, fileMimeType: true, sale: { select: { memberId: true } } } });
  if (!document?.fileData) return new Response("Archivo no disponible", { status: 404 });
  if (!hasPermission(user, "SALES") && user.member?.id !== document.sale.memberId) return new Response("Sin acceso", { status: 403 });
  const mime = ["image/jpeg", "image/png", "application/pdf"].includes(document.fileMimeType ?? "") ? document.fileMimeType! : "application/octet-stream";
  return new Response(Uint8Array.from(document.fileData), { headers: { "Content-Type": mime, "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}
