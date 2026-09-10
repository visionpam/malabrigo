import { connection } from "next/server";
import { FileCheck2, FileClock, FilePenLine } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";
import { contractStatusLabel, formatDate, statusTone } from "@/lib/format";

export default async function MyContractsPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={FileCheck2} title="Perfil no disponible" description="Tu cuenta no tiene un perfil de socio asociado." />;
  await connection();
  const contracts = await db.contract.findMany({ where: { sale: { memberId: user.member.id } }, orderBy: { createdAt: "desc" }, include: { template: true, sale: { include: { program: true } } } });
  return <><PageHeader eyebrow="Portal del socio" title="Mis contratos" description="Documentos vinculados exclusivamente a tus inversiones." />
    <section className="module-metrics"><MetricCard label="Contratos" value={String(contracts.length)} detail="Documentos asociados" icon={FileCheck2} /><MetricCard label="Firmados" value={String(contracts.filter((item) => item.status === "SIGNED").length)} detail="Aceptaciones registradas" icon={FilePenLine} /><MetricCard label="Pendientes" value={String(contracts.filter((item) => !["SIGNED", "VOIDED"].includes(item.status)).length)} detail="En proceso" icon={FileClock} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Documentos personales</h2><p>Contrato, programa, estado y fecha de generación</p></div></div>{contracts.length ? <div className="table-wrap module-table"><table><thead><tr><th>Venta</th><th>Programa</th><th>Documento</th><th>Estado</th><th>Generado</th><th>Archivo</th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id}><td className="money">{contract.sale.code}</td><td>{contract.sale.program.name}</td><td>{contract.template.name} v{contract.template.version}</td><td><StatusPill tone={statusTone(contract.status)}>{contractStatusLabel[contract.status]}</StatusPill></td><td>{formatDate(contract.generatedAt ?? contract.createdAt)}</td><td>{contract.documentUrl ? <a className="row-action" href={contract.documentUrl} target="_blank" rel="noreferrer">Ver contrato</a> : "Pendiente"}</td></tr>)}</tbody></table></div> : <EmptyState icon={FileCheck2} title="No tienes contratos" description="Los documentos generados para tus inversiones aparecerán aquí." />}</section>
  </>;
}
