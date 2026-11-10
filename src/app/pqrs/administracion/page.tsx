import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { EmptyState, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { canManagePqrs, pqrsCategoryLabels, pqrsStatusLabels } from "@/lib/pqrs";
import { formatDate } from "@/lib/format";

export default async function PqrsAdministrationPage() {
  const user = await requireUser();
  if (!canManagePqrs(user)) redirect("/pqrs");
  const cases = await db.pqrsCase.findMany({ orderBy: { updatedAt: "desc" }, include: { owner: { select: { displayName: true, email: true } } } });
  return <><PageHeader eyebrow="Atención al cliente" title="Bandeja de PQRS" description="Revisa y responde las solicitudes de embajadores e inversionistas." />
    <section className="module-panel"><div className="module-toolbar"><div><h2>Radicados recientes</h2><p>{cases.length} caso(s) · ordenados por última actividad</p></div></div>{cases.length ? <div className="pqrs-case-list">{cases.map((item) => <Link className="pqrs-case-row" href={`/pqrs/${item.id}`} key={item.id}><span><strong>{item.code}</strong><small>{formatDate(item.createdAt)} · {pqrsCategoryLabels[item.category]}</small></span><span className="pqrs-case-subject">{item.subject}<small>{item.owner.displayName} · {item.owner.email}</small></span><StatusPill tone={item.status === "CLOSED" ? "neutral" : item.status === "ANSWERED" ? "success" : "warning"}>{pqrsStatusLabels[item.status]}</StatusPill></Link>)}</div> : <EmptyState icon={Inbox} title="Sin casos radicados" description="Las solicitudes aparecerán aquí cuando se registren." />}</section>
  </>;
}
