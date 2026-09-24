import Link from "next/link";
import { connection } from "next/server";
import { Building2, Eye, FolderKanban, HardHat } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { ProjectActions } from "./project-actions";

export default async function ProjectsPage() {
  await requirePermission("CONSTRUCTION"); await connection();
  const projects = await db.constructionProject.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { stages: true } } } });
  return <><PageHeader eyebrow="Administración de obra" title="Proyectos" description="Crea y administra los proyectos antes de registrar sus etapas y avances." action={<ProjectActions />} />
    <section className="module-metrics"><MetricCard label="Proyectos" value={String(projects.length)} detail="Registrados" icon={FolderKanban} /><MetricCard label="Activos" value={String(projects.filter((project) => project.active).length)} detail="Visibles para socios" icon={Building2} /><MetricCard label="Etapas" value={String(projects.reduce((sum, project) => sum + project._count.stages, 0))} detail="En todos los proyectos" icon={HardHat} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Proyectos registrados</h2><p>Selecciona uno para configurar su cronograma.</p></div></div>{projects.length ? <div className="table-wrap module-table"><table><thead><tr><th>Código</th><th>Proyecto</th><th>Estado</th><th>Etapas</th><th>Acciones</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td><strong>{project.code}</strong></td><td><strong>{project.name}</strong>{project.description && <><br /><small>{project.description}</small></>}</td><td><StatusPill tone={project.active ? "success" : "warning"}>{project.active ? "Activo" : "Inactivo"}</StatusPill></td><td>{project._count.stages}</td><td><div className="row-actions"><Link className="row-action row-action-icon" href={`/avance-obra?proyecto=${project.id}`} aria-label={`Ver avance de ${project.name}`} title="Ver avance"><Eye size={17} aria-hidden="true" /></Link><ProjectActions project={{ id: project.id, code: project.code, name: project.name, description: project.description, active: project.active }} /></div></td></tr>)}</tbody></table></div> : <EmptyState icon={Building2} title="Aún no hay proyectos" description="Crea el primer proyecto para empezar a configurar sus etapas de obra." />}</section></>;
}
