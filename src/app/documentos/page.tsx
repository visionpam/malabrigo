import { connection } from "next/server";
import { Building2, Eye, FileArchive, Files } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { DocumentDialog } from "./document-dialog";
import { DocumentRowActions } from "./document-row-actions";

const labels: Record<string, string> = { RENDER: "Render", PROJECT: "Proyecto", TIMELINE: "Línea de tiempo", CONSTRUCTION_PROGRESS: "Avance de obra", CABINS: "Cabañas", PLANS: "Planos", CONTRACT_MODEL: "Modelo de contrato", OTHER: "Otro" };

export default async function DocumentsPage() {
  await requirePermission("CONTRACTS");
  await connection();
  const documents = await db.documentRecord.findMany({ where: { memberId: null }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, category: true, visibility: true, status: true, voidReason: true, createdAt: true, url: true, uploadedBy: { select: { displayName: true } } } });
  return <><PageHeader eyebrow="Repositorio" title="Documentos del proyecto" description="Renders, planos, cronograma, modelos y archivos institucionales." action={<DocumentDialog />} />
    <section className="module-metrics"><MetricCard label="Documentos" value={String(documents.length)} detail="Archivos registrados" icon={Files} /><MetricCard label="Visibles para socios" value={String(documents.filter((item) => item.status === "APPROVED" && item.visibility === "ALL_MEMBERS").length)} detail="Repositorio público interno" icon={Building2} /><MetricCard label="Solo administración" value={String(documents.filter((item) => item.status === "APPROVED" && item.visibility === "ADMIN_ONLY").length)} detail="Acceso restringido" icon={FileArchive} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Biblioteca institucional</h2><p>Documentación oficial clasificada</p></div></div>{documents.length ? <div className="table-wrap module-table"><table><thead><tr><th>Título</th><th>Categoría</th><th>Visibilidad</th><th>Estado</th><th>Publicado por</th><th>Fecha</th><th>Archivo</th><th>Acciones</th></tr></thead><tbody>{documents.map((item) => <tr key={item.id}><td>{item.title}</td><td>{labels[item.category] ?? item.category}</td><td><StatusPill tone={item.visibility === "ALL_MEMBERS" ? "success" : "neutral"}>{item.visibility === "ALL_MEMBERS" ? "Todos los socios" : "Administración"}</StatusPill></td><td><span title={item.voidReason ?? undefined}><StatusPill tone={item.status === "VOIDED" ? "danger" : "success"}>{item.status === "VOIDED" ? "Anulado" : "Publicado"}</StatusPill></span></td><td>{item.uploadedBy?.displayName ?? "Sistema"}</td><td>{formatDate(item.createdAt)}</td><td><a className="row-action row-action-icon" href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.title}`} title="Abrir documento"><Eye size={17} aria-hidden="true" /></a></td><td><DocumentRowActions document={{ id: item.id, title: item.title, category: item.category, visibility: item.visibility, status: item.status }} /></td></tr>)}</tbody></table></div> : <EmptyState icon={Files} title="Repositorio vacío" description="Publica renders, proyecto, línea de tiempo, planos y modelos oficiales." />}</section></>;
}
