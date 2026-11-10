import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { EmptyState, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { canFilePqrs, pqrsCategoryLabels, pqrsStatusLabels } from "@/lib/pqrs";
import { formatDate } from "@/lib/format";
import { NewPqrsForm } from "./pqrs-forms";

export default async function PqrsPage() {
  const user = await requireUser();
  if (!canFilePqrs(user)) return <EmptyState icon={MessageSquareText} title="Portal no disponible" description="Este servicio está disponible para embajadores e inversionistas." />;
  const cases = await db.pqrsCase.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, code: true, category: true, subject: true, status: true, createdAt: true, lastAdminReplyAt: true, memberSeenAt: true } });
  return <><PageHeader eyebrow="Atención al cliente" title="Mis PQRS" description="Radica una petición, queja, reclamo o sugerencia y consulta su seguimiento privado." />
    <section className="module-panel pqrs-create-panel"><div className="module-toolbar"><div><h2>Nueva solicitud</h2><p>Te entregaremos un número de radicado para hacer seguimiento.</p></div></div><NewPqrsForm /></section>
    <section className="module-panel pqrs-list-panel"><div className="module-toolbar"><div><h2>Mis radicados</h2><p>Las respuestas de atención al cliente aparecerán aquí.</p></div></div>{cases.length ? <div className="pqrs-case-list">{cases.map((item) => { const unread = item.lastAdminReplyAt && (!item.memberSeenAt || item.lastAdminReplyAt > item.memberSeenAt); return <Link className="pqrs-case-row" href={`/pqrs/${item.id}`} key={item.id}><span><strong>{item.code}</strong><small>{formatDate(item.createdAt)} · {pqrsCategoryLabels[item.category]}</small></span><span className="pqrs-case-subject">{item.subject}</span><span className="pqrs-case-state">{unread && <b className="pqrs-unread">Nueva respuesta</b>}<StatusPill tone={item.status === "CLOSED" ? "neutral" : item.status === "ANSWERED" ? "success" : "warning"}>{pqrsStatusLabels[item.status]}</StatusPill></span></Link>; })}</div> : <EmptyState icon={MessageSquareText} title="Aún no hay solicitudes" description="Usa el formulario para radicar tu primera PQRS." />}</section>
  </>;
}
