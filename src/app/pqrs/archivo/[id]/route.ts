import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { canManagePqrs } from "@/lib/pqrs";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("No encontrado", { status: 404 });
  const message = await db.pqrsMessage.findUnique({ where: { id }, select: { fileData: true, fileMimeType: true, fileName: true, case: { select: { ownerId: true } } } });
  if (!message?.fileData || (!canManagePqrs(user) && message.case.ownerId !== user.id)) return new Response("No encontrado", { status: 404 });
  const name = (message.fileName ?? "adjunto").replace(/[\r\n"\\/]/g, "_");
  return new Response(Buffer.from(message.fileData), { headers: { "Content-Type": message.fileMimeType ?? "application/octet-stream", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
