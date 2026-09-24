import { connection } from "next/server";
import { Building2, Eye, Files, FolderOpen } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate, statusTone } from "@/lib/format";
import { OwnDocumentForm } from "./own-document-form";

const labels: Record<string, string> = { IDENTITY: "Identidad", SEPARATION_FORM: "Ficha de separación", SEPARATION_PROOF: "Comprobante de separación", SALE_PROOF: "Comprobante de venta", SIGNED_CONTRACT: "Contrato firmado", ANNEX: "Anexo", RENDER: "Render", PROJECT: "Proyecto", TIMELINE: "Línea de tiempo", CONSTRUCTION_PROGRESS: "Avance de obra", CABINS: "Cabañas", PLANS: "Planos", CONTRACT_MODEL: "Modelo de contrato", OTHER: "Otro" };
const documentFields = { id: true, title: true, category: true, status: true, createdAt: true, url: true } as const;

export default async function OwnDocumentsPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={Files} title="Sin expediente" description="Tu cuenta no tiene un socio asociado." />;
  await connection();
  const [privateDocuments, companyDocuments, sales] = await Promise.all([
    db.documentRecord.findMany({ where: { memberId: user.member.id }, orderBy: { createdAt: "desc" }, select: documentFields }),
    db.documentRecord.findMany({ where: { memberId: null, visibility: "ALL_MEMBERS", status: "APPROVED" }, orderBy: { createdAt: "desc" }, select: documentFields }),
    db.sale.findMany({ where: { memberId: user.member.id, status: { not: "CANCELLED" } }, include: { program: true } }),
  ]);
  return <><PageHeader eyebrow="Portal del socio" title="Mis documentos" description="Consulta tu expediente, envía archivos y accede a la biblioteca del proyecto." />
    <section className="module-metrics"><MetricCard label="Mi expediente" value={String(privateDocuments.length)} detail={`${privateDocuments.filter((item) => item.status === "PENDING").length} por validar`} icon={FolderOpen} /><MetricCard label="Biblioteca" value={String(companyDocuments.length)} detail="Documentos institucionales" icon={Building2} /><MetricCard label="Inversiones" value={String(sales.length)} detail="Para relacionar archivos" icon={Files} /></section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Enviar al expediente</h2><p>Administración validará el archivo antes de aprobarlo.</p></div></div><div className="panel-body"><OwnDocumentForm sales={sales.map((sale) => ({ id: sale.id, label: `${sale.code} · ${sale.program.name}` }))} /></div></section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Mi expediente</h2><p>Archivos vinculados exclusivamente a tu cuenta.</p></div></div>{privateDocuments.length ? <div className="table-wrap module-table"><table><thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha</th><th>Archivo</th></tr></thead><tbody>{privateDocuments.map((item) => <tr key={item.id}><td>{item.title}</td><td>{labels[item.category] ?? item.category}</td><td><StatusPill tone={statusTone(item.status)}>{item.status === "PENDING" ? "Por validar" : item.status === "APPROVED" ? "Aprobado" : "Rechazado"}</StatusPill></td><td>{formatDate(item.createdAt)}</td><td><a className="row-action row-action-icon" href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.title}`} title="Abrir documento"><Eye size={17} aria-hidden="true" /></a></td></tr>)}</tbody></table></div> : <EmptyState icon={FolderOpen} title="Expediente vacío" description="Envía tu primer documento desde el formulario." />}</section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Biblioteca del proyecto</h2><p>Renders, planos, cronograma y documentos oficiales.</p></div></div>{companyDocuments.length ? <div className="document-grid">{companyDocuments.map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><Files size={22} /><div><strong>{item.title}</strong><span>{labels[item.category] ?? item.category} · {formatDate(item.createdAt)}</span></div></a>)}</div> : <EmptyState icon={Building2} title="Sin documentos publicados" description="La empresa publicará aquí la información oficial del proyecto." />}</section></>;
}
