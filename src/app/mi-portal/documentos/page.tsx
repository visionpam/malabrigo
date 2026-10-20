import { connection } from "next/server";
import { Building2, Eye, FileCheck2, Files, FolderOpen, ScrollText } from "lucide-react";
import { ContractFileLinks } from "@/components/contract-file-links";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { contractStatusLabel, formatDate, statusTone } from "@/lib/format";
import { RequestedDocumentUpload } from "./requested-document-upload";

const labels: Record<string, string> = { IDENTITY: "Identidad / DNI", SEPARATION_FORM: "Ficha de separación", SEPARATION_PROOF: "Comprobante de separación", SALE_PROOF: "Comprobante de pago", SIGNED_CONTRACT: "Contrato firmado", ANNEX: "Anexo", OTHER: "Otro" };
const statusLabels: Record<string, string> = { REQUESTED: "Por cargar", PENDING: "En revisión", APPROVED: "Aprobado", REJECTED: "Rechazado", CANCELLED: "Cancelado" };
const subjectLabels: Record<string, string> = { SALE: "Venta", PRIMARY_HOLDER: "Titular principal", HOLDER: "Titular", BENEFICIARY: "Beneficiario" };
const documentFields = { id: true, title: true, category: true, status: true, createdAt: true, url: true } as const;

function isCertificate(title: string) {
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.includes("certificado de accionista") || normalized.includes("ficha ruc");
}

export default async function OwnDocumentsPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={Files} title="Sin expediente" description="Tu cuenta no tiene un socio asociado." />;
  await connection();
  const [legacyDocuments, companyDocuments, sales, contracts] = await Promise.all([
    db.documentRecord.findMany({ where: { memberId: user.member.id }, orderBy: { createdAt: "desc" }, select: documentFields }),
    db.documentRecord.findMany({ where: { memberId: null, visibility: "ALL_MEMBERS", status: "APPROVED" }, orderBy: { createdAt: "desc" }, select: documentFields }),
    db.sale.findMany({ where: { memberId: user.member.id, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, select: { id: true, code: true, program: { select: { name: true } }, dossierDocuments: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, category: true, subjectKind: true, subjectName: true, status: true, rejectionReason: true, fileName: true, createdAt: true } } } }),
    db.contract.findMany({ where: { sale: { memberId: user.member.id } }, orderBy: { createdAt: "desc" }, include: { template: true, sale: { include: { program: true } } } }),
  ]);
  const all = sales.flatMap((sale) => sale.dossierDocuments);
  const certificates = [
    ...sales.flatMap((sale) => sale.dossierDocuments.filter((item) => item.status === "APPROVED" && item.fileName && isCertificate(item.title)).map((item) => ({ id: `dossier-${item.id}`, title: item.title, detail: `${sale.program.name} · ${sale.code}`, date: item.createdAt, url: `/expediente/archivo/${item.id}` }))),
    ...legacyDocuments.filter((item) => item.status === "APPROVED" && isCertificate(item.title)).map((item) => ({ id: `legacy-${item.id}`, title: item.title, detail: "Documento del inversionista", date: item.createdAt, url: item.url })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  const otherLegacyDocuments = legacyDocuments.filter((item) => !isCertificate(item.title));

  return <>
    <PageHeader eyebrow="Portal del inversionista" title="Mis contratos" description="Consulta tus contratos, certificados y solicitudes de documentación por inversión." />
    <section className="module-metrics" aria-label="Resumen de documentos">
      <MetricCard label="Contrato de participación" value={String(contracts.length)} detail="Contratos asociados a tus inversiones" icon={FileCheck2} />
      <MetricCard label="Mis certificados" value={String(certificates.length)} detail="Certificado de Accionista o ficha RUC" icon={ScrollText} />
      <MetricCard label="Biblioteca del proyecto" value={String(companyDocuments.length)} detail="Documentos oficiales" icon={Building2} />
    </section>

    <section id="mis-contratos" className="module-panel portal-section"><div className="module-toolbar"><div><h2>Mis contratos</h2><p>Contratos de participación vinculados a tus inversiones</p></div></div>{contracts.length ? <div className="table-wrap module-table"><table><thead><tr><th>Venta</th><th>Programa</th><th>Documento</th><th>Estado</th><th>Generado</th><th>Archivo</th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id}><td className="money">{contract.sale.code}</td><td>{contract.sale.program.name}</td><td>{contract.template.name} v{contract.template.version}</td><td><StatusPill tone={statusTone(contract.status)}>{contractStatusLabel[contract.status]}</StatusPill></td><td>{formatDate(contract.generatedAt ?? contract.createdAt)}</td><td><ContractFileLinks id={contract.id} documentUrl={contract.documentUrl} downloadable={Boolean(contract.documentText)} /></td></tr>)}</tbody></table></div> : <EmptyState icon={FileCheck2} title="Sin contratos de participación" description="Los contratos generados para tus inversiones aparecerán aquí." />}</section>

    <section id="mis-certificados" className="module-panel portal-section"><div className="module-toolbar"><div><h2>Mis certificados</h2><p>Certificado de Accionista o ficha RUC vinculados a tu expediente.</p></div></div>{certificates.length ? <div className="document-grid">{certificates.map((item) => <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id}><ScrollText size={22} aria-hidden="true" /><div><strong>{item.title}</strong><span>{item.detail} · {formatDate(item.date)}</span></div></a>)}</div> : <EmptyState icon={ScrollText} title="Sin certificados disponibles" description="Cuando administración publique tu Certificado de Accionista o ficha RUC, aparecerá aquí." />}</section>

    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Solicitudes de documentos</h2><p>Haz tu solicitud o envía documentos solicitados.</p></div></div><div className="dossier-list">{sales.flatMap((sale) => sale.dossierDocuments.map((item) => <article className="dossier-item" key={item.id}><div className="dossier-item-main"><div><strong>{item.title}</strong><span className={`dossier-status dossier-status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span></div><p>{sale.code} · {sale.program.name} · {subjectLabels[item.subjectKind]}: {item.subjectName} · {labels[item.category] ?? item.category}</p>{item.status === "REJECTED" && <p className="dossier-reason">Motivo del rechazo: {item.rejectionReason || "Consulta con administración."}</p>}{item.fileName && <small>Archivo enviado: {item.fileName} · {formatDate(item.createdAt)}</small>}</div><div className="dossier-item-actions">{item.fileName && <a className="row-action row-action-icon" href={`/expediente/archivo/${item.id}`} target="_blank" rel="noopener noreferrer" title="Ver archivo" aria-label={`Ver ${item.title}`}><Eye size={17} aria-hidden="true" /></a>}{(item.status === "REQUESTED" || item.status === "REJECTED") && <RequestedDocumentUpload documentId={item.id} title={item.title} />}</div></article>))}</div>{all.length === 0 && <EmptyState icon={FolderOpen} title="Sin solicitudes" description="Por ahora administración no ha solicitado documentos de tus inversiones." />}</section>

    {otherLegacyDocuments.length > 0 && <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Documentos anteriores</h2><p>Archivos registrados antes del expediente por venta; se conservan para consulta.</p></div></div><div className="table-wrap module-table"><table><thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha</th><th>Archivo</th></tr></thead><tbody>{otherLegacyDocuments.map((item) => <tr key={item.id}><td>{item.title}</td><td>{labels[item.category] ?? item.category}</td><td><StatusPill tone={statusTone(item.status)}>{item.status === "PENDING" ? "Por validar" : item.status === "APPROVED" ? "Aprobado" : "Rechazado"}</StatusPill></td><td>{formatDate(item.createdAt)}</td><td><a className="row-action row-action-icon" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.title}`} title="Abrir documento"><Eye size={17} aria-hidden="true" /></a></td></tr>)}</tbody></table></div></section>}
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Biblioteca del proyecto</h2><p>Renders, planos, cronograma y documentos oficiales.</p></div></div>{companyDocuments.length ? <div className="document-grid">{companyDocuments.map((item) => <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id}><Files size={22} aria-hidden="true" /><div><strong>{item.title}</strong><span>{labels[item.category] ?? item.category} · {formatDate(item.createdAt)}</span></div></a>)}</div> : <EmptyState icon={Building2} title="Sin documentos publicados" description="La empresa publicará aquí la información oficial del proyecto." />}</section>
  </>;
}
