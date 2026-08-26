import { connection } from "next/server";
import { Search, UserRoundPlus, UsersRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatDate, memberStatusLabel, statusTone } from "@/lib/format";
import { MemberCreateDialog } from "./member-create-dialog";
import { MemberManageDialog } from "./member-manage-dialog";

export default async function MembersPage() {
  await connection();
  const [members, total, active, prospects] = await Promise.all([
    db.member.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { referralCode: true, _count: { select: { sales: true } } } }),
    db.member.count(), db.member.count({ where: { status: "ACTIVE" } }), db.member.count({ where: { status: "PROSPECT" } }),
  ]);
  const history = members.length ? await db.auditLog.findMany({ where: { entityType: "Member", entityId: { in: members.map((member) => member.id) } }, orderBy: { createdAt: "desc" }, take: 250 }) : [];
  const historyByMember = new Map<string, typeof history>();
  for (const item of history) historyByMember.set(item.entityId, [...(historyByMember.get(item.entityId) ?? []), item]);

  return <>
    <PageHeader eyebrow="Gestión comercial" title="Socios" description="Expedientes, programas y estado de cada socio inversionista." action={<MemberCreateDialog />} />
    <section className="module-metrics"><MetricCard label="Total socios" value={String(total)} detail="Expedientes registrados" icon={UsersRound} /><MetricCard label="Activos" value={String(active)} detail="Con programa vigente" icon={UsersRound} /><MetricCard label="Prospectos" value={String(prospects)} detail="Pendientes de activación" icon={UserRoundPlus} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Directorio de socios</h2><p>Últimos 50 registros</p></div><label className="module-search"><Search size={15} /><input placeholder="Buscar por nombre o documento" /></label></div>
      {members.length === 0 ? <EmptyState icon={UsersRound} title="Aún no hay socios" description="El primer registro aparecerá aquí con su expediente y estado comercial." /> : <div className="table-wrap module-table"><table><thead><tr><th>Socio</th><th>Documento</th><th>Estado</th><th>Ventas</th><th>Referido</th><th>Registro</th><th></th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><div className="member-cell"><span>{member.firstName[0]}{member.lastName[0]}</span><strong>{member.firstName} {member.lastName}</strong></div></td><td>{member.documentType} {member.documentNumber}</td><td><StatusPill tone={statusTone(member.status)}>{memberStatusLabel[member.status]}</StatusPill></td><td>{member._count.sales}</td><td>{member.referralCode?.code ?? "—"}</td><td>{formatDate(member.createdAt)}</td><td><MemberManageDialog member={{ id: member.id, documentType: member.documentType, documentNumber: member.documentNumber, firstName: member.firstName, lastName: member.lastName, countryCode: member.countryCode, phone: member.phone ?? "", email: member.email, status: member.status, joinedAt: member.joinedAt ? formatDate(member.joinedAt) : null, history: (historyByMember.get(member.id) ?? []).map((item) => ({ id: item.id.toString(), action: item.action, createdAt: formatDate(item.createdAt) })) }} /></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
