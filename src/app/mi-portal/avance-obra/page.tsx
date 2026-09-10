import { connection } from "next/server";
import { CalendarDays, Camera, HardHat } from "lucide-react";
import { EmptyState, MetricCard, PageHeader } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";
import { formatDate } from "@/lib/format";

export default async function MemberConstructionPage() {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={HardHat} title="Perfil no disponible" description="Tu cuenta no tiene un perfil de socio asociado." />;
  await connection();
  const stages = await db.projectStage.findMany({ orderBy: { sortOrder: "asc" }, include: { updates: { where: { publishedAt: { not: null } }, orderBy: { occurredAt: "desc" }, include: { media: { orderBy: { sortOrder: "asc" } } } } } });
  const updates = stages.flatMap((stage) => stage.updates);
  const progress = stages.length ? stages.reduce((sum, stage) => sum + Number(stage.weight) * Number(stage.updates[0]?.progress ?? 0), 0) / 100 : 0;
  return <><PageHeader eyebrow="Portal del socio" title="Avance de obra" description="Consulta los hitos y publicaciones oficiales del proyecto." />
    <section className="module-metrics"><MetricCard label="Avance ponderado" value={`${progress.toFixed(1)}%`} detail="Según publicaciones" icon={HardHat} /><MetricCard label="Etapas" value={String(stages.length)} detail="Cronograma del proyecto" icon={CalendarDays} /><MetricCard label="Actualizaciones" value={String(updates.length)} detail="Publicaciones visibles" icon={Camera} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Cronograma publicado</h2><p>Información visible para todos los socios</p></div></div>{stages.length ? <div className="stage-list">{stages.map((stage) => <article className="stage-item" key={stage.id}><div className="stage-number">{stage.sortOrder}</div><div><div className="stage-title"><strong>{stage.name}</strong><span>{stage.updates[0] ? `${stage.updates[0].progress}%` : "Sin publicación"}</span></div><p>{stage.updates[0]?.description ?? stage.description ?? "Sin descripción"}</p><small>{stage.updates[0] ? `Actualizado ${formatDate(stage.updates[0].occurredAt)}` : `${formatDate(stage.startsAt)} — ${formatDate(stage.endsAt)}`}</small>{stage.updates[0]?.media.length ? <div className="construction-media">{stage.updates[0].media.map((media) => <a href={media.url} target="_blank" rel="noreferrer" key={media.id}>{media.altText}</a>)}</div> : null}</div></article>)}</div> : <EmptyState icon={HardHat} title="Sin avances publicados" description="Las actualizaciones oficiales aparecerán aquí." />}</section>
  </>;
}
