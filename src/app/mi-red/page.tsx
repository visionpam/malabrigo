import { Award, Coins, Network, TrendingUp, Trophy, UsersRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser, roleCodes } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate, formatMoney, statusTone } from "@/lib/format";
import { getAmbassadorNetwork } from "@/lib/network";
import { readAmbassadorRankMetrics } from "@/lib/commission-ledger";
import { LeadershipJourney } from "./leadership-journey";
import { MemberCreateDialog } from "../socios/member-create-dialog";
import { redirect } from "next/navigation";

const commissionLabels = { PENDING: "Pendiente", APPROVED: "Aprobada", PAID: "Pagada", REVERSED: "Reversada" } as const;

export default async function MyNetworkPage() {
  const user = await requireUser();
  if (!roleCodes(user).includes("AMBASSADOR") || !user.member?.ambassadorProfile) redirect("/mi-portal");
  const ambassadorId = user.member.ambassadorProfile.id;
  const [profile, levels, ranks, rankMetrics, countries, documentTypes, occupations, maritalStatuses, regions, provinces, districts] = await Promise.all([
    db.ambassadorProfile.findUniqueOrThrow({ where: { id: ambassadorId }, include: { member: true, commissions: { orderBy: { createdAt: "desc" }, take: 100 }, rankBonuses: { orderBy: { period: "desc" } }, awards: { orderBy: { earnedAt: "desc" }, include: { rank: true } }, rankHistory: { orderBy: { achievedAt: "desc" }, include: { rank: true } } } }),
    getAmbassadorNetwork(ambassadorId),
    db.rankDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    readAmbassadorRankMetrics(ambassadorId),
    db.country.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true } }),
    db.documentTypeOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true } }),
    db.occupationOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true } }),
    db.maritalStatusOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true } }),
    db.addressRegion.findMany({ where: { active: true }, select: { code: true, name: true, countryCode: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.addressProvince.findMany({ where: { active: true }, select: { code: true, name: true, regionCode: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.addressDistrict.findMany({ where: { active: true }, select: { code: true, name: true, provinceCode: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const people = levels.flatMap((level) => level.people);
  const networkVolume = people.reduce((sum, item) => sum + item.volume, 0);
  const pending = profile.commissions.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + Number(item.amount), 0);
  return <><PageHeader eyebrow="Portal del embajador" title="Mi red" description={`Código ${profile.referralCode}. Se muestran exclusivamente tus ocho generaciones.`} action={<MemberCreateDialog countries={countries} documentTypes={documentTypes} occupations={occupations} maritalStatuses={maritalStatuses} regions={regions} provinces={provinces.map((item) => ({ ...item, parentCode: item.regionCode }))} districts={districts.map((item) => ({ ...item, parentCode: item.provinceCode }))} ambassadors={[]} networkMode />} />
    <section className="module-metrics"><MetricCard label="Socios directos" value={String(rankMetrics?.directCount ?? 0)} detail={`${rankMetrics?.memberCount ?? 0} elegibles en toda la red`} icon={UsersRound} /><MetricCard label="Valor de ventas en red" value={formatMoney(networkVolume)} detail="Ventas no anuladas · USD" icon={TrendingUp} /><MetricCard label="Comisiones pendientes" value={formatMoney(pending)} detail="Pendientes de aprobación" icon={Coins} /><MetricCard label="Rango actual" value={ranks.find((rank) => rank.code === profile.currentRank)?.name ?? "Sin rango"} detail="Carrera del embajador" icon={Trophy} /></section>

    {ranks.length > 0 && rankMetrics && <LeadershipJourney ranks={ranks.map((rank) => ({ code: rank.code, name: rank.name, sortOrder: rank.sortOrder, logoUrl: rank.logoUrl, memberCount: rank.memberCount, directCount: rank.directCount, directPoints: rank.directPoints, totalPoints: Number(rank.totalPoints), deadlineMonths: rank.deadlineMonths }))} currentRank={profile.currentRank} metrics={{ memberCount: rankMetrics.memberCount, directCount: rankMetrics.directCount, directPoints: rankMetrics.directPoints, volumePoints: rankMetrics.volumePoints }} salesCount={people.reduce((sum, item) => sum + item.sales, 0)} affiliatedAt={rankMetrics.affiliatedAt.toISOString()} asOf={new Date().toISOString()} />}

    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Red por generaciones</h2><p>Personas directas e indirectas hasta el octavo nivel.</p></div></div>{people.length === 0 ? <EmptyState icon={UsersRound} title="Tu red todavía está vacía" description="Registra tu primer socio con el botón superior." /> : <div className="network-levels">{levels.filter((level) => level.people.length).map((level) => <section key={level.level}><div className="section-title"><h3>Generación {level.level}</h3><span>{level.people.length} personas</span></div><div className="table-wrap module-table"><table><thead><tr><th>Código</th><th>Socio</th><th>Perfil</th><th>Estado</th><th>Ventas</th><th>Volumen</th><th>Registro</th></tr></thead><tbody>{level.people.map((entry) => <tr key={entry.memberId}><td className="money">{entry.memberCode}</td><td>{entry.name}<small className="cell-secondary">{entry.document}</small></td><td>{entry.profile}</td><td><StatusPill tone={entry.status === "ACTIVE" ? "success" : "warning"}>{entry.status === "ACTIVE" ? "Activo" : "Prospecto"}</StatusPill></td><td>{entry.sales}</td><td className="money">{formatMoney(entry.volume)}</td><td>{formatDate(entry.createdAt)}</td></tr>)}</tbody></table></div></section>)}</div>}</section>

    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Mis comisiones</h2><p>Ingresos directos e indirectos de tu red.</p></div></div>{profile.commissions.length ? <div className="table-wrap module-table"><table><thead><tr><th>Nivel</th><th>Monto</th><th>Puntos</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{profile.commissions.map((item) => <tr key={item.id}><td>{item.generation === 1 ? "Directa" : `Generación ${item.generation}`}</td><td className="money">{formatMoney(item.amount)}</td><td>{item.points}</td><td><StatusPill tone={statusTone(item.status)}>{commissionLabels[item.status]}</StatusPill></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Network} title="Aún no hay comisiones" description="Se mostrarán cuando las ventas patrocinadas cumplan el pago requerido." />}</section>

    <section className="portal-summary-grid"><article className="module-panel"><div className="module-toolbar"><div><h2>Bonos mensuales</h2><p>Pagos por rango</p></div></div>{profile.rankBonuses.length ? <div className="record-list padded-list">{profile.rankBonuses.map((item) => <div key={item.id}><div><strong>{formatMoney(item.amount)}</strong><span>{formatDate(item.period)}</span></div><StatusPill tone={statusTone(item.status)}>{commissionLabels[item.status]}</StatusPill></div>)}</div> : <EmptyState icon={Coins} title="Sin bonos" description="Los bonos se generan al alcanzar un rango." />}</article><article className="module-panel"><div className="module-toolbar"><div><h2>Premios obtenidos</h2><p>Reconocimientos de carrera</p></div></div>{profile.awards.length ? <div className="record-list padded-list">{profile.awards.map((item) => <div key={item.id}><div><strong>{item.rank.rewardName ?? item.rank.name}</strong><span>{item.deliveredAt ? `Entregado ${formatDate(item.deliveredAt)}` : `Obtenido ${formatDate(item.earnedAt)}`}</span></div><Award size={18} /></div>)}</div> : <EmptyState icon={Award} title="Sin premios" description="Tus reconocimientos aparecerán con cada ascenso." />}</article></section>
  </>;
}
