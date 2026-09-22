import Link from "next/link";
import { connection } from "next/server";
import { Building2, CalendarDays, Camera, HardHat } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/access-control";
import { formatDate } from "@/lib/format";
import { ConstructionDialog } from "./construction-dialog";

export default async function ConstructionPage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  await requirePermission("CONSTRUCTION"); await connection();
  const { proyecto } = await searchParams;
  const projects = await db.constructionProject.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, code: true, active: true } });
  const selected = projects.find((item) => item.id === proyecto) ?? projects.find((item) => item.active) ?? projects[0];
  const stages = selected ? await db.projectStage.findMany({ where: { projectId: selected.id }, orderBy: { sortOrder: "asc" }, include: { updates: { orderBy: { occurredAt: "desc" }, include: { media: { orderBy: { sortOrder: "asc" } } } } } }) : [];
  const updateCount = stages.reduce((sum, stage) => sum + stage.updates.length, 0);
  const progress = stages.length ? stages.reduce((sum, stage) => sum + Number(stage.weight) * Number(stage.updates[0]?.progress ?? 0), 0) / 100 : 0;
  return <>
    <PageHeader eyebrow="Proyecto inmobiliario" title="Avance de obra" description="Configura hitos, porcentaje físico y publicaciones visibles para los socios." action={<div className="row-actions"><Link className="row-action" href="/proyectos"><Building2 size={16} />Administrar proyectos</Link>{selected?.active && <ConstructionDialog key={selected.id} projectId={selected.id} stages={stages.map((stage) => ({ id: stage.id, name: stage.name, progress: Number(stage.updates[0]?.progress ?? 0) }))} />}</div>} />
    {projects.length > 0 && <section className="module-panel project-picker"><div className="module-toolbar"><div><h2>Proyecto seleccionado</h2><p>Los indicadores y el cronograma corresponden solo a este proyecto.</p></div><StatusPill tone={selected?.active ? "success" : "warning"}>{selected?.active ? "Activo" : "Inactivo"}</StatusPill></div><div className="project-choice-list" aria-label="Seleccionar proyecto">{projects.map((project) => <Link key={project.id} href={`/avance-obra?proyecto=${project.id}`} aria-current={project.id === selected?.id ? "page" : undefined} className={project.id === selected?.id ? "project-choice active" : "project-choice"}><Building2 size={17} /><span><strong>{project.name}</strong><small>{project.code}</small></span></Link>)}</div></section>}
    {selected ? <><section className="module-metrics"><MetricCard label="Avance ponderado" value={`${progress.toFixed(1)}%`} detail="Según hitos publicados" icon={HardHat} /><MetricCard label="Etapas" value={String(stages.length)} detail={`${stages.reduce((sum, stage) => sum + Number(stage.weight), 0).toFixed(1)}% ponderado`} icon={CalendarDays} /><MetricCard label="Actualizaciones" value={String(updateCount)} detail="Publicaciones registradas" icon={Camera} /></section>
      <section className="module-panel"><div className="module-toolbar"><div><h2>Cronograma de {selected.name}</h2><p>Seguimiento por etapa y evidencia documental</p></div></div>
        {stages.length === 0 ? <EmptyState icon={HardHat} title="Crea el cronograma del proyecto" description={selected.active ? "Usa Publicar avance y agrega la primera etapa con su peso y fechas." : "Activa el proyecto para registrar sus etapas."} /> : <div className="stage-list">{stages.map((stage) => <article className="stage-item" key={stage.id}><div className="stage-number">{stage.sortOrder}</div><div><div className="stage-title"><strong>{stage.name}</strong><span>{stage.updates[0] ? `${Number(stage.updates[0].progress)}%` : "Sin avance"} · peso {Number(stage.weight)}%</span></div><p>{stage.description ?? "Sin descripción"}</p><small>{formatDate(stage.startsAt)} — {formatDate(stage.endsAt)}</small>{stage.updates.length ? <div className="update-timeline">{stage.updates.map((update) => <div key={update.id}><strong>{update.title}</strong><span>{formatDate(update.occurredAt)} · {Number(update.progress)}% · {update.publishedAt ? "Publicado" : "Borrador"}</span><p>{update.description}</p>{update.media.length ? <div className="construction-media">{update.media.map((media) => <a href={media.url} target="_blank" rel="noreferrer" key={media.id}>{media.altText}</a>)}</div> : null}</div>)}</div> : null}</div></article>)}</div>}
      </section></> : <section className="module-panel"><EmptyState icon={Building2} title="Primero crea un proyecto" description="En Administrar proyectos podrás crear el proyecto antes de registrar sus etapas y avances." /></section>}
  </>;
}
