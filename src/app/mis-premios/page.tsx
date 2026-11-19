import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/module-ui";
import { requireUser, roleCodes } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function MyAwardsPage() {
  const user = await requireUser();
  if (!roleCodes(user).includes("AMBASSADOR") || !user.member?.ambassadorProfile) redirect("/mi-portal");
  const awards = await db.rankAward.findMany({
    where: { ambassadorId: user.member.ambassadorProfile.id },
    orderBy: { earnedAt: "desc" },
    include: { rank: true },
  });

  return <>
    <PageHeader eyebrow="Portal del embajador" title="Mis premios" description="Reconocimientos obtenidos en tu carrera de liderazgo." />
    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Premios obtenidos</h2><p>Reconocimientos de carrera.</p></div></div>{awards.length ? <div className="record-list padded-list">{awards.map((item) => <div key={item.id}><div><strong>{item.rank.rewardName ?? item.rank.name}</strong><span>{item.deliveredAt ? `Entregado ${formatDate(item.deliveredAt)}` : `Obtenido ${formatDate(item.earnedAt)}`}</span></div><Award size={18} aria-hidden="true" /></div>)}</div> : <EmptyState icon={Award} title="Sin premios" description="Tus reconocimientos aparecerán con cada ascenso." />}</section>
  </>;
}
