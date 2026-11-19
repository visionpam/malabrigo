import { TrendingUp, UsersRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser, roleCodes } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { getAmbassadorNetwork } from "@/lib/network";
import { readAmbassadorRankMetrics } from "@/lib/commission-ledger";
import { LeadershipJourney } from "./leadership-journey";
import { StartLineIcon } from "./leadership-icons";
import { MemberCreateDialog } from "../socios/member-create-dialog";
import { redirect } from "next/navigation";

export default async function MyNetworkPage() {
  const user = await requireUser();
  if (!roleCodes(user).includes("AMBASSADOR") || !user.member?.ambassadorProfile) redirect("/mi-portal");
  const ambassadorId = user.member.ambassadorProfile.id;
  const [profile, levels, ranks, rankMetrics, countries, documentTypes, occupations, maritalStatuses, regions, provinces, districts] = await Promise.all([
    db.ambassadorProfile.findUniqueOrThrow({ where: { id: ambassadorId }, select: { referralCode: true, currentRank: true } }),
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
  const approvedPeople = people.filter((item) => item.status === "ACTIVE" || item.status === "APPROVED");
  const networkVolume = approvedPeople.reduce((sum, item) => sum + item.volume, 0);
  return <><PageHeader eyebrow="Portal del embajador" title="Mi red" description={`Código ${profile.referralCode}. Se muestran exclusivamente tus ocho generaciones.`} action={<MemberCreateDialog countries={countries} documentTypes={documentTypes} occupations={occupations} maritalStatuses={maritalStatuses} regions={regions} provinces={provinces.map((item) => ({ ...item, parentCode: item.regionCode }))} districts={districts.map((item) => ({ ...item, parentCode: item.provinceCode }))} ambassadors={[]} networkMode />} />
    <section className="module-metrics"><MetricCard label="Socios directos" value={String(rankMetrics?.directCount ?? 0)} detail={`${rankMetrics?.memberCount ?? 0} elegibles en toda la red`} icon={UsersRound} /><MetricCard label="Valor de ventas en red" value={formatMoney(networkVolume)} detail="Ventas no anuladas · USD" icon={TrendingUp} /><article className="module-metric"><div className="kpi-icon leadership-kpi-icon" aria-hidden="true"><StartLineIcon /></div><div><span>Rango actual</span><strong>{ranks.find((rank) => rank.code === profile.currentRank)?.name ?? "Sin rango"}</strong><small>Carrera del embajador</small></div></article></section>

    {ranks.length > 0 && rankMetrics && <LeadershipJourney ranks={ranks.map((rank) => ({ code: rank.code, name: rank.name, sortOrder: rank.sortOrder, logoUrl: rank.logoUrl, rewardName: rank.rewardName, rewardDescription: rank.rewardDescription, memberCount: rank.memberCount, directCount: rank.directCount, directPoints: rank.directPoints, totalPoints: Number(rank.totalPoints), deadlineMonths: rank.deadlineMonths }))} currentRank={profile.currentRank} metrics={{ memberCount: rankMetrics.memberCount, directCount: rankMetrics.directCount, directPoints: rankMetrics.directPoints, volumePoints: rankMetrics.volumePoints }} salesCount={approvedPeople.reduce((sum, item) => sum + item.sales, 0)} affiliatedAt={rankMetrics.affiliatedAt.toISOString()} asOf={new Date().toISOString()} />}

    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Red por generaciones</h2><p>Personas directas e indirectas hasta el octavo nivel.</p></div></div>{people.length === 0 ? <EmptyState icon={UsersRound} title="Tu red todavía está vacía" description="Registra tu primer socio con el botón superior." /> : <div className="network-levels">{levels.filter((level) => level.people.length).map((level) => <section key={level.level}><div className="section-title"><h3>Generación {level.level}</h3><span>{level.people.length} personas</span></div><div className="table-wrap module-table"><table><thead><tr><th>Código</th><th>Socio</th><th>Perfil</th><th>Estado</th><th>Programas</th><th>Tipo de socio</th><th>Registro</th></tr></thead><tbody>{level.people.map((entry) => <tr key={entry.memberId}><td className="money">{entry.memberCode}</td><td>{entry.name}<small className="cell-secondary">{entry.document}</small></td><td>{entry.profile}</td><td><StatusPill tone={entry.status === "ACTIVE" || entry.status === "APPROVED" ? "success" : "warning"}>{entry.status === "ACTIVE" || entry.status === "APPROVED" ? "Activo" : "En evaluación"}</StatusPill></td><td>{entry.programs.length ? entry.programs.join(", ") : "Sin programa"}</td><td>{entry.memberType}</td><td>{formatDate(entry.createdAt)}</td></tr>)}</tbody></table></div></section>)}</div>}</section>

  </>;
}
