import { connection } from "next/server";
import { Search, UserRoundPlus, UsersRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { MemberCreateDialog } from "./member-create-dialog";
import { MemberManageDialog } from "./member-manage-dialog";
import { MemberExpedientDialog } from "./member-expedient-dialog";
import { requirePermission } from "@/lib/access-control";

export default async function MembersPage() {
  await requirePermission("MEMBERS");
  await connection();
  const [members, total, active, prospects, ambassadors] = await Promise.all([
    db.member.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { investorProfile: true, ambassadorProfile: true, user: true, beneficiaries: { orderBy: { createdAt: "asc" } }, documents: { orderBy: { createdAt: "desc" } }, sales: { where: { status: { not: "CANCELLED" } }, include: { program: true } }, _count: { select: { sales: true } } } }),
    db.member.count(), db.member.count({ where: { status: "ACTIVE" } }), db.member.count({ where: { status: "PROSPECT" } }),
    db.ambassadorProfile.findMany({ where: { status: "ACTIVE" }, include: { member: true }, orderBy: { member: { firstName: "asc" } } }),
  ]);
  const history = members.length ? await db.auditLog.findMany({ where: { entityType: "Member", entityId: { in: members.map((member) => member.id) } }, orderBy: { createdAt: "desc" }, take: 250 }) : [];
  const historyByMember = new Map<string, typeof history>();
  for (const item of history) historyByMember.set(item.entityId, [...(historyByMember.get(item.entityId) ?? []), item]);

  return <>
    <PageHeader eyebrow="Gestión de personas" title="Socios" description="Una identidad única con perfil inversionista, embajador o ambos." action={<MemberCreateDialog ambassadors={ambassadors.map((item) => ({ id: item.id, name: `${item.member.firstName} ${item.member.lastName}`, code: item.referralCode }))} />} />
    <section className="module-metrics"><MetricCard label="Total personas" value={String(total)} detail="Identidades registradas" icon={UsersRound} /><MetricCard label="Inversionistas activos" value={String(active)} detail="Con programa vigente" icon={UsersRound} /><MetricCard label="Prospectos" value={String(prospects)} detail="Pendientes de inversión" icon={UserRoundPlus} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Directorio de personas</h2><p>Últimos 50 registros</p></div><label className="module-search"><Search size={15} /><input placeholder="Buscar por nombre, código o documento" /></label></div>
      {members.length === 0 ? <EmptyState icon={UsersRound} title="Aún no hay personas" description="El primer registro aparecerá aquí con su código y perfiles." /> : <div className="table-wrap module-table"><table><thead><tr><th>Código</th><th>Persona</th><th>Perfiles</th><th>Cuenta</th><th>Ventas</th><th>Registro</th><th></th></tr></thead><tbody>{members.map((member) => <tr key={member.id}>
        <td className="money">{member.memberCode}</td><td><div className="member-cell"><span>{member.firstName[0]}{member.lastName[0]}</span><strong>{member.firstName} {member.lastName}</strong></div></td>
        <td><div className="profile-tags">{member.investorProfile && <StatusPill tone="info">Inversionista</StatusPill>}{member.ambassadorProfile && <StatusPill tone="success">Embajador</StatusPill>}</div></td>
        <td><StatusPill tone={member.user?.status === "ACTIVE" ? "success" : "warning"}>{member.user?.status === "ACTIVE" ? "Activa" : member.user ? "Invitación pendiente" : "Sin acceso"}</StatusPill></td><td>{member._count.sales}</td><td>{formatDate(member.createdAt)}</td>
        <td><div className="row-actions"><MemberManageDialog ambassadors={ambassadors.map((item) => ({ id: item.id, name: `${item.member.firstName} ${item.member.lastName}`, code: item.referralCode }))} member={{ id: member.id, memberCode: member.memberCode, documentType: member.documentType, documentNumber: member.documentNumber, firstName: member.firstName, lastName: member.lastName, countryCode: member.countryCode, phone: member.phone ?? "", email: member.email, residence: member.residence ?? "", occupation: member.occupation ?? "", maritalStatus: member.maritalStatus ?? "", profileType: member.investorProfile && member.ambassadorProfile ? "BOTH" : member.ambassadorProfile ? "AMBASSADOR" : "INVESTOR", userStatus: member.user?.status ?? null, status: member.status, joinedAt: member.joinedAt ? formatDate(member.joinedAt) : null, history: (historyByMember.get(member.id) ?? []).map((item) => ({ id: item.id.toString(), action: item.action, createdAt: formatDate(item.createdAt) })) }} /><MemberExpedientDialog member={{ id: member.id, name: `${member.firstName} ${member.lastName}`, beneficiaryCap: Math.max(1, ...member.sales.map((sale) => sale.program.beneficiaryCap)), beneficiaries: member.beneficiaries, documents: member.documents.map((document) => ({ id: document.id, title: document.title, category: document.category, url: document.url, status: document.status })), sales: member.sales.map((sale) => ({ id: sale.id, code: sale.code, program: sale.program.name })) }} /></div></td>
      </tr>)}</tbody></table></div>}
    </section>
  </>;
}
