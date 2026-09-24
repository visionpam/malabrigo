"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";



export async function reviewMemberDocumentAction(documentId: string, status: "APPROVED" | "REJECTED", formData: FormData) {
  const actor = await requirePermission("MEMBERS");
  const document = await db.documentRecord.findUnique({ where: { id: documentId }, select: { id: true, memberId: true, status: true } });
  if (!document?.memberId || document.status !== "PENDING") return;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (status === "REJECTED" && reason.length < 3) return;
  await db.documentRecord.update({ where: { id: documentId }, data: { status, rejectionReason: status === "REJECTED" ? reason : null, reviewedAt: new Date() } });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: `MEMBER_DOCUMENT_${status}`, entityType: "DocumentRecord", entityId: documentId, after: { status, reason: reason || null } } });
  revalidatePath("/socios"); revalidatePath("/mi-portal/documentos");
}
