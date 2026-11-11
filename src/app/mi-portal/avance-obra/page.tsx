import { connection } from "next/server";
import { Camera, FileImage, HardHat } from "lucide-react";
import { EmptyState, MetricCard, PageHeader } from "@/components/module-ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";
import { formatDate } from "@/lib/format";
import { PROJECT_NAME } from "@/lib/project-name";
import { selectDevelopmentName } from "@/lib/construction-portal";

export default async function MemberConstructionPage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  const user = await requireUser();
  if (!user.member) return <EmptyState icon={HardHat} title="Perfil no disponible" description="Tu cuenta no tiene un perfil de socio asociado." />;
  await connection();

  const { proyecto } = await searchParams;
  const [allProjects, allRenders] = await Promise.all([
    db.constructionProject.findMany({ where: { active: true }, orderBy: [{ developmentName: "asc" }, { createdAt: "asc" }], include: { stages: { orderBy: { sortOrder: "asc" }, include: { updates: { where: { publishedAt: { not: null } }, orderBy: { occurredAt: "desc" }, include: { media: { orderBy: { sortOrder: "asc" } } } } } } } }),
    db.documentRecord.findMany({ where: { memberId: null, visibility: "ALL_MEMBERS", status: "APPROVED", category: "RENDER" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, url: true, createdAt: true } }),
  ]);
  const selectedName = selectDevelopmentName(allProjects, proyecto);
  const projects = allProjects.filter((project) => project.developmentName === selectedName);
  const renders = selectedName === PROJECT_NAME ? allRenders : [];
  const updates = projects.flatMap((project, index) => project.stages.flatMap((stage) => stage.updates.map((update) => ({ project, stage, update, index }))));

  return <>
    <PageHeader eyebrow="Proyecto inmobiliario" title={selectedName ?? "Proyectos"} description="Consulta las etapas y publicaciones oficiales del avance de obra." />
    <section className="module-metrics" aria-label="Ir al material del proyecto">
      <MetricCard label="Etapas" value={String(projects.length)} detail="Ver etapas" icon={HardHat} href="#etapas-obra" />
      <MetricCard label="Renderizados" value={String(renders.length)} detail="Ver renderizados" icon={FileImage} href="#renderizados" />
      <MetricCard label="Avances de Obra" value={String(updates.length)} detail="Ver publicaciones" icon={Camera} href="#avances-obra" />
    </section>

    <div id="etapas-obra" className="construction-target">
      {projects.length ? projects.map((project, index) => {
        const progress = project.stages.reduce((sum, stage) => sum + Number(stage.weight) * Number(stage.updates[0]?.progress ?? 0), 0) / 100;
        return <section className="module-panel portal-section" key={project.id}>
          <div className="module-toolbar"><div><h2>Etapa {index + 1}</h2><p>{project.code} · Avance ponderado {progress.toFixed(1)}%</p></div></div>
          {project.stages.length ? <div className="stage-list">{project.stages.map((stage) => <article className="stage-item" key={stage.id}>
            <div className="stage-number">{stage.sortOrder}</div><div><div className="stage-title"><strong>{stage.name}</strong><span>{stage.updates[0] ? `${stage.updates[0].progress}%` : "Sin publicación"}</span></div><p>{stage.updates[0]?.description ?? stage.description ?? "Sin descripción"}</p><small>{stage.updates[0] ? `Actualizado ${formatDate(stage.updates[0].occurredAt)}` : `${formatDate(stage.startsAt)} — ${formatDate(stage.endsAt)}`}</small>{stage.updates[0]?.media.length ? <div className="construction-media">{stage.updates[0].media.map((media) => <a href={media.url} target="_blank" rel="noopener noreferrer" key={media.id}>{media.altText}</a>)}</div> : null}</div>
          </article>)}</div> : <EmptyState icon={HardHat} title="Sin avances publicados" description="Los avances de esta etapa aparecerán aquí." />}
        </section>;
      }) : <section className="module-panel portal-section"><EmptyState icon={HardHat} title="Sin etapas activas" description="Los avances oficiales aparecerán aquí cuando haya etapas disponibles." /></section>}
    </div>

    <section id="renderizados" className="module-panel portal-section"><div className="module-toolbar"><div><h2>Renderizados</h2><p>Material visual publicado para los socios.</p></div></div>
      {renders.length ? <div className="document-grid">{renders.map((render) => <a href={render.url} target="_blank" rel="noopener noreferrer" key={render.id}><FileImage size={22} aria-hidden="true" /><div><strong>{render.title}</strong><span>Publicado {formatDate(render.createdAt)}</span></div></a>)}</div> : <EmptyState icon={FileImage} title="Sin renderizados publicados" description="Los renders oficiales aparecerán aquí cuando estén disponibles." />}
    </section>

    <section id="avances-obra" className="module-panel portal-section"><div className="module-toolbar"><div><h2>Avances de Obra</h2><p>Historial de publicaciones y evidencias de cada etapa.</p></div></div>
      {updates.length ? <div className="stage-list">{updates.map(({ project, stage, update, index }) => <article className="stage-item" key={update.id}><div className="stage-number">{index + 1}</div><div><div className="stage-title"><strong>{update.title}</strong><span>{Number(update.progress)}%</span></div><p>Etapa {index + 1} · {project.code} · {stage.name}</p><p>{update.description}</p><small>Publicado {formatDate(update.occurredAt)}</small>{update.media.length ? <div className="construction-media">{update.media.map((media) => <a href={media.url} target="_blank" rel="noopener noreferrer" key={media.id}>{media.altText}</a>)}</div> : null}</div></article>)}</div> : <EmptyState icon={Camera} title="Sin avances publicados" description="Las publicaciones oficiales aparecerán aquí cuando estén disponibles." />}
    </section>
  </>;
}
