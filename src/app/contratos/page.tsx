import { connection } from "next/server";
import { FileCheck2, FileClock, FilePenLine } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";
import { contractStatusLabel, formatDate, statusTone } from "@/lib/format";
import { ContractActions, ContractManage } from "./contract-dialogs";

export default async function ContractsPage() {
  await requirePermission("CONTRACTS"); await connection();
  const [contracts, templates, signed, sales] = await Promise.all([
    db.contract.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { template: true, sale: { include: { member: true, program: true } } } }),
    db.contractTemplate.findMany({ orderBy: [{ code: "asc" }, { version: "desc" }] }),
    db.contract.count({ where: { status: "SIGNED" } }),
    db.sale.findMany({ where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, include: { member: true, program: true } }),
  ]);
  const activeTemplates = templates.filter((template) => template.active);
  return <><PageHeader eyebrow="Documentación legal" title="Contratos" description="Plantillas versionadas, generación documental y seguimiento de firmas." action={<ContractActions templates={activeTemplates.map((item) => ({ id: item.id, label: `${item.name} v${item.version}` }))} sales={sales.map((item) => ({ id: item.id, label: `${item.code} · ${item.member.firstName} ${item.member.lastName} · ${item.program.name}` }))} />} />
    <section className="module-metrics"><MetricCard label="Contratos" value={String(contracts.length)} detail="Registros generados" icon={FileCheck2} /><MetricCard label="Firmados" value={String(signed)} detail="Con documento confirmado" icon={FilePenLine} /><MetricCard label="Plantillas activas" value={String(activeTemplates.length)} detail="Versiones disponibles" icon={FileClock} /></section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Plantillas</h2><p>Versiones legales disponibles para nuevas operaciones</p></div></div>{templates.length ? <div className="table-wrap module-table"><table><thead><tr><th>Código</th><th>Nombre</th><th>Versión</th><th>Estado</th><th>Actualización</th></tr></thead><tbody>{templates.map((template) => <tr key={template.id}><td className="money">{template.code}</td><td>{template.name}</td><td>v{template.version}</td><td><StatusPill tone={template.active ? "success" : "neutral"}>{template.active ? "Activa" : "Inactiva"}</StatusPill></td><td>{formatDate(template.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={FileClock} title="Crea la primera plantilla" description="Usa Nueva plantilla para definir el modelo contractual y sus campos automáticos." />}</section>
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Documentos generados</h2><p>Trazabilidad por venta, plantilla y versión</p></div></div>{contracts.length === 0 ? <EmptyState icon={FileCheck2} title="No hay contratos generados" description="Crea una plantilla y genera el contrato desde una venta vigente." /> : <div className="table-wrap module-table"><table><thead><tr><th>Socio</th><th>Venta</th><th>Programa</th><th>Plantilla</th><th>Estado</th><th>Generado</th><th>Archivo</th><th></th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id}><td>{contract.sale.member.firstName} {contract.sale.member.lastName}</td><td className="money">{contract.sale.code}</td><td>{contract.sale.program.name}</td><td>{contract.template.name} v{contract.template.version}</td><td><StatusPill tone={statusTone(contract.status)}>{contractStatusLabel[contract.status]}</StatusPill></td><td>{formatDate(contract.generatedAt ?? contract.createdAt)}</td><td>{contract.documentUrl ? <a className="row-action" href={contract.documentUrl} target="_blank" rel="noreferrer">Ver documento</a> : "Pendiente"}</td><td><ContractManage contract={{ id: contract.id, status: contract.status }} /></td></tr>)}</tbody></table></div>}</section>
  </>;
}
