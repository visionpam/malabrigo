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
  const projects = await db.constructionProject.findMany({ where: { active: true }, orderBy: { createdAt: "asc" }, include: { stages: { orderBy: { sortOrder: "asc" }, include: { updates: { where: { publishedAt: { not: null } }, orderBy: { occurredAt: "desc" }, include: { media: { orderBy: { sortOrder: "asc" } } } } } } } });
  const stages = projects.flatMap((project) => project.stages);
  const updates = stages.flatMap((stage) => stage.updates);
  return <><PageHeader eyebrow="Portal del socio" title="Avance de obra" description="Consulta los hitos y publicaciones oficiales de cada proyecto." />
    <section className="module-metrics"><MetricCard label="Proyectos" value={String(projects.length)} detail="En seguimiento" icon={HardHat} /><MetricCard label="Etapas" value={String(stages.length)} detail="Cronogramas registrados" icon={CalendarDays} /><MetricCard label="Actualizaciones" value={String(updates.length)} detail="Publicaciones visibles" icon={Camera} /></section>
    {projects.length ? projects.map((project) => { const progress = project.stages.reduce((sum, stage) => sum + Number(stage.weight) * Number(stage.updates[0]?.progress ?? 0), 0) / 100; return <section className="module-panel portal-section" key={project.id}><div className="module-toolbar"><div><h2>{project.name}</h2><p>{project.code} · Avance ponderado {progress.toFixed(1)}%</p></div></div>{project.stages.length ? <div className="stage-list">{project.stages.map((stage) => <article className="stage-item" key={stage.id}><div className="stage-number">{stage.sortOrder}</div><div><div className="stage-title"><strong>{stage.name}</strong><span>{stage.updates[0] ? `${stage.updates[0].progress}%` : "Sin publicación"}</span></div><p>{stage.updates[0]?.description ?? stage.description ?? "Sin descripción"}</p><small>{stage.updates[0] ? `Actualizado ${formatDate(stage.updates[0].occurredAt)}` : `${formatDate(stage.startsAt)} — ${formatDate(stage.endsAt)}`}</small>{stage.updates[0]?.media.length ? <div className="construction-media">{stage.updates[0].media.map((media) => <a href={media.url} target="_blank" rel="noreferrer" key={media.id}>{media.altText}</a>)}</div> : null}</div></article>)}</div> : <EmptyState icon={HardHat} title="Sin etapas publicadas" description="El cronograma de este proyecto aparecerá aquí." />}</section>; }) : <section className="module-panel"><EmptyState icon={HardHat} title="Sin proyectos activos" description="Los avances oficiales aparecerán aquí cuando administración registre un proyecto." /></section>}
  </>;
}
