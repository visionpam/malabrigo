import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { z } from "zod";
import { PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { canFilePqrs, canManagePqrs, pqrsCategoryLabels, pqrsStatusLabels } from "@/lib/pqrs";
import { markPqrsReadAction } from "../actions";
import { PqrsMessageForm, PqrsStatusButton } from "../pqrs-forms";

export default async function PqrsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const item = await db.pqrsCase.findUnique({ where: { id }, include: { owner: { select: { displayName: true } }, messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { displayName: true } } } } } });
  if (!item) notFound();
  const staff = canManagePqrs(user) && item.ownerId !== user.id;
  const owner = item.ownerId === user.id && canFilePqrs(user);
  if (!staff && !owner) notFound();
  const unread = owner && item.lastAdminReplyAt && (!item.memberSeenAt || item.lastAdminReplyAt > item.memberSeenAt);
  return <><PageHeader eyebrow={`Radicado ${item.code}`} title={item.subject} description={`${pqrsCategoryLabels[item.category]} · ${item.owner.displayName} · ${formatDate(item.createdAt)}`} action={<Link className="secondary-button" href={staff ? "/pqrs/administracion" : "/pqrs"}><ArrowLeft size={17} aria-hidden="true" />Volver</Link>} />
    <section className="module-panel pqrs-detail-panel"><div className="module-toolbar"><div><h2>Seguimiento del caso</h2><p>Los mensajes y adjuntos solo son visibles para ti y el equipo de atención.</p></div><StatusPill tone={item.status === "CLOSED" ? "neutral" : item.status === "ANSWERED" ? "success" : "warning"}>{pqrsStatusLabels[item.status]}</StatusPill></div>
      {unread && <form action={markPqrsReadAction.bind(null, id)} className="pqrs-read-form"><span>Tienes una nueva respuesta de atención al cliente.</span><button className="secondary-button" type="submit">Marcar como leída</button></form>}
      <div className="pqrs-thread">{item.messages.map((message) => <article className={message.isStaff ? "pqrs-message staff" : "pqrs-message"} key={message.id}><div><strong>{message.isStaff ? "Atención al cliente" : message.author.displayName}</strong><small>{formatDate(message.createdAt)}</small></div><p>{message.body}</p>{message.fileName && <a href={`/pqrs/archivo/${message.id}`} target="_blank" rel="noopener noreferrer"><Paperclip size={16} aria-hidden="true" />{message.fileName}</a>}</article>)}</div>
      {item.status !== "CLOSED" && <PqrsMessageForm caseId={id} staff={staff} />}
      <div className="pqrs-status-actions">{staff && item.status === "FILED" && <PqrsStatusButton caseId={id} next="IN_REVIEW" label="Iniciar revisión" />}{staff && item.status === "ANSWERED" && <PqrsStatusButton caseId={id} next="CLOSED" label="Cerrar caso" />}{owner && item.status === "CLOSED" && <PqrsStatusButton caseId={id} next="IN_REVIEW" label="Reabrir caso" />}</div>
    </section>
  </>;
}
