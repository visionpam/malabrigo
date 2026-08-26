import { connection } from "next/server";
import { FileCheck2, FileClock, FilePenLine, Plus } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { contractStatusLabel, formatDate, statusTone } from "@/lib/format";

export default async function ContractsPage() {
  await connection();
  const [contracts, templates, signed] = await Promise.all([
    db.contract.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { template: true, sale: { include: { member: true, program: true } } } }),
    db.contractTemplate.count({ where: { active: true } }), db.contract.count({ where: { status: "SIGNED" } }),
  ]);
  return <><PageHeader eyebrow="Documentación legal" title="Contratos" description="Plantillas, generación documental y aceptación de términos." action={<button className="primary-button"><Plus size={17} /> Nueva plantilla</button>} />
    <section className="module-metrics"><MetricCard label="Contratos" value={String(contracts.length)} detail="Últimos registros" icon={FileCheck2} /><MetricCard label="Firmados" value={String(signed)} detail="Con aceptación registrada" icon={FilePenLine} /><MetricCard label="Plantillas activas" value={String(templates)} detail="Versiones disponibles" icon={FileClock} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Documentos generados</h2><p>Trazabilidad por venta, plantilla y versión</p></div></div>{contracts.length === 0 ? <EmptyState icon={FileCheck2} title="No hay contratos generados" description="La estructura está lista para recibir las plantillas legales definitivas." /> : <div className="table-wrap module-table"><table><thead><tr><th>Socio</th><th>Venta</th><th>Programa</th><th>Plantilla</th><th>Estado</th><th>Generado</th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id}><td>{contract.sale.member.firstName} {contract.sale.member.lastName}</td><td className="money">{contract.sale.code}</td><td>{contract.sale.program.name}</td><td>{contract.template.name} v{contract.template.version}</td><td><StatusPill tone={statusTone(contract.status)}>{contractStatusLabel[contract.status]}</StatusPill></td><td>{formatDate(contract.generatedAt ?? contract.createdAt)}</td></tr>)}</tbody></table></div>}</section>
  </>;
}
