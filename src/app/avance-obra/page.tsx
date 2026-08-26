import { connection } from "next/server";
import { CalendarDays, Camera, HardHat, Upload } from "lucide-react";
import { EmptyState, MetricCard, PageHeader } from "@/components/module-ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function ConstructionPage() {
  await connection();
  const stages = await db.projectStage.findMany({ orderBy: { sortOrder: "asc" }, include: { updates: { orderBy: { occurredAt: "desc" }, include: { _count: { select: { media: true } } } } } });
  const updateCount = stages.reduce((sum, stage) => sum + stage.updates.length, 0);
  const progress = stages.length ? stages.reduce((sum, stage) => sum + Number(stage.weight) * Number(stage.updates[0]?.progress ?? 0), 0) / 100 : 0;
  return <><PageHeader eyebrow="Proyecto inmobiliario" title="Avance de obra" description="Hitos, porcentaje físico y publicaciones para los socios." action={<button className="primary-button"><Upload size={17} /> Publicar avance</button>} />
    <section className="module-metrics"><MetricCard label="Avance ponderado" value={`${progress.toFixed(1)}%`} detail="Según hitos publicados" icon={HardHat} /><MetricCard label="Etapas" value={String(stages.length)} detail="Cronograma configurado" icon={CalendarDays} /><MetricCard label="Actualizaciones" value={String(updateCount)} detail="Publicaciones registradas" icon={Camera} /></section>
    <section className="module-panel"><div className="module-toolbar"><div><h2>Cronograma del proyecto</h2><p>Seguimiento por etapa y evidencia fotográfica</p></div></div>{stages.length === 0 ? <EmptyState icon={HardHat} title="Cronograma pendiente de configuración" description="Las etapas se cargarán cuando se confirmen las fechas oficiales del proyecto." /> : <div className="stage-list">{stages.map((stage) => <article className="stage-item" key={stage.id}><div className="stage-number">{stage.sortOrder}</div><div><div className="stage-title"><strong>{stage.name}</strong><span>{stage.updates[0] ? `${stage.updates[0].progress}%` : "Sin avance"}</span></div><p>{stage.description ?? "Sin descripción"}</p><small>{formatDate(stage.startsAt)} — {formatDate(stage.endsAt)}</small></div></article>)}</div>}</section>
  </>;
}
