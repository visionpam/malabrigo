import { hasPermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Documento no encontrado", { status: 404 });
  const document = await db.documentRecord.findUnique({ where: { id }, select: { memberId: true, visibility: true, status: true, fileData: true, fileMimeType: true } });
  if (!document || document.memberId) return new Response("Documento no encontrado", { status: 404 });
  if (!hasPermission(user, "CONTRACTS") && !(user.member && document.visibility === "ALL_MEMBERS" && document.status === "APPROVED")) return new Response("Sin acceso", { status: 403 });
  if (!document.fileData) return new Response("Archivo no disponible", { status: 404 });
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const mime = allowed.includes(document.fileMimeType ?? "") ? document.fileMimeType! : "application/octet-stream";
  return new Response(Uint8Array.from(document.fileData), { headers: { "Content-Type": mime, "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
