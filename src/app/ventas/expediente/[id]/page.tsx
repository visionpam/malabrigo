import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { DossierAdmin } from "./dossier-admin";

export default async function SaleDossierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("SALES");
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sale = await db.sale.findUnique({ where: { id }, select: { id: true, code: true, status: true, member: { select: { firstName: true, lastName: true } }, program: { select: { name: true } }, beneficiaries: { orderBy: { createdAt: "asc" }, select: { id: true, fullName: true, isHolder: true } }, dossierDocuments: { orderBy: { createdAt: "desc" }, select: { id: true, subjectKind: true, subjectName: true, category: true, title: true, status: true, rejectionReason: true, fileName: true, fileMimeType: true, uploadedById: true, createdAt: true } }, paymentSubmissions: { orderBy: { submittedAt: "desc" }, select: { id: true, status: true, amount: true, submittedAt: true } } } });
  if (!sale) notFound();
  return <div className="sale-dossier-page"><Link className="row-action" href="/ventas">← Volver a ventas</Link><DossierAdmin sale={{ id: sale.id, code: sale.code, status: sale.status, memberName: `${sale.member.firstName} ${sale.member.lastName}`, program: sale.program.name, people: sale.beneficiaries, documents: sale.dossierDocuments.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), paymentSupports: sale.paymentSubmissions.map((item) => ({ id: item.id, status: item.status, amount: Number(item.amount), submittedAt: item.submittedAt.toISOString() })) }} /></div>;
}
