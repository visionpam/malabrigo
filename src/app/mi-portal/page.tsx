import { FileCheck2, Landmark, UsersRound, WalletCards } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requireUser, roleCodes } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate, formatMoney, saleStatusLabel, statusTone } from "@/lib/format";
import { redirect } from "next/navigation";

const projectName = "Malabrigo";

export default async function MyPortalPage() {
  const user = await requireUser();
  if (!roleCodes(user).includes("MEMBER") || !user.member?.investorProfile) redirect("/mi-red");

  const member = await db.member.findUniqueOrThrow({
    where: { id: user.member.id },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        include: {
          program: true,
          beneficiaries: { orderBy: { createdAt: "asc" } },
          payments: { where: { status: "CONFIRMED" } },
          shareAllocation: true,
        },
      },
    },
  });

  const activeSales = member.sales.filter((sale) => sale.status !== "CANCELLED");
  const programNames = [...new Set(activeSales.map((sale) => sale.program.name))];
  const hasCash = activeSales.some((sale) => sale.mode === "CASH");
  const hasFinancing = activeSales.some((sale) => sale.mode === "CREDIT");
  const paymentMode = hasCash && hasFinancing ? "Mixta" : hasCash ? "Contado" : hasFinancing ? "Financiado" : "Sin inversiones";
  const programValue = activeSales.reduce((sum, sale) => sum + Number(sale.totalPrice), 0);
  const beneficiaryCount = activeSales.flatMap((sale) => sale.beneficiaries).filter((person) => !person.isHolder).length;

  return <>
    <PageHeader eyebrow="Portal del inversionista" title="Mis inversiones" description={`${member.firstName}, aquí solo se muestra tu información personal y contractual.`} />

    <section className="module-metrics" aria-label="Resumen de inversiones">
      <article className="module-metric investor-program-metric"><div className="kpi-icon"><Landmark size={20} aria-hidden="true" /></div><div><span>Proyecto / programa</span><strong>{programNames.length ? programNames.map((name) => `${projectName} / ${name}`).join(" · ") : "Sin inversiones"}</strong><small>{activeSales.length} {activeSales.length === 1 ? "inversión registrada" : "inversiones registradas"}</small></div></article>
      <MetricCard label="Valor del programa" value={formatMoney(programValue)} detail="Valor contratado vigente" icon={WalletCards} />
      <MetricCard label="Modalidad" value={paymentMode} detail={hasCash && hasFinancing ? "Contado y financiado" : "Según tus inversiones vigentes"} icon={FileCheck2} />
      <MetricCard label="Beneficiarios" value={String(beneficiaryCount)} detail="Asignaciones en programas" icon={UsersRound} />
    </section>

    <section className="module-panel"><div className="module-toolbar"><div><h2>Mis programas</h2><p>Condiciones, beneficios y estado de cada inversión</p></div></div>
      {member.sales.length === 0 ? <EmptyState icon={Landmark} title="No tienes inversiones registradas" description="Cuando se registre una inversión a tu nombre aparecerá en este espacio." /> : <div className="table-wrap module-table investor-program-table"><table><thead><tr><th>Proyecto</th><th>Programa</th><th>Tipo de membresía</th><th>Modalidad</th><th>Valor</th><th>Monto pagado</th><th>Número de acciones</th><th>Estado</th><th>Fecha de registro</th></tr></thead><tbody>{member.sales.map((sale) => <tr key={sale.id}><td><strong>{projectName}</strong><small className="cell-secondary">{sale.code}</small></td><td>{sale.program.name}</td><td>{sale.program.membershipName ?? "No definida"}</td><td>{sale.mode === "CASH" ? "Contado" : "Financiado"}</td><td className="money">{formatMoney(sale.totalPrice)}</td><td className="money">{formatMoney(sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0))}</td><td>{sale.shareAllocation?.quantity != null ? sale.shareAllocation.quantity.toLocaleString("es-PE") : "No aplica"}</td><td><StatusPill tone={statusTone(sale.status)}>{saleStatusLabel[sale.status]}</StatusPill></td><td>{formatDate(sale.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="module-panel portal-section"><div className="module-toolbar"><div><h2>Titulares y beneficiarios</h2><p>Personas asignadas por separado a cada programa.</p></div></div>
      {activeSales.length ? <div className="investor-program-people">{activeSales.map((sale) => <article key={sale.id}><div className="section-title"><div><h3>{sale.program.name} · {sale.code}</h3><p>{sale.ownershipType === "MARRIED" ? "Sociedad conyugal" : "Un contratante"}</p></div><span>{sale.beneficiaries.filter((person) => person.isHolder).length + 1} titulares · {sale.beneficiaries.filter((person) => !person.isHolder).length} beneficiarios</span></div><div className="table-wrap module-table"><table><thead><tr><th>Nombre</th><th>Tipo documento / N° documento</th><th>Relación corporativa</th><th>Condición</th></tr></thead><tbody><tr><td>{member.firstName} {member.lastName}</td><td>{member.documentType} / {member.documentNumber}</td><td>Socio principal</td><td>Titular principal</td></tr>{sale.beneficiaries.map((person) => <tr key={person.id}><td>{person.fullName}</td><td><span className={person.documentType ? "" : "investor-document-type"}>{person.documentType ?? "Tipo no registrado"}</span> / {person.document ?? "N° no registrado"}</td><td>{person.relationship}</td><td>{person.isHolder ? "Titular adicional" : "Beneficiario"}</td></tr>)}</tbody></table></div></article>)}</div> : <EmptyState icon={UsersRound} title="Sin programas vigentes" description="Las asignaciones aparecerán cuando se registre un programa." />}
    </section>
  </>;
}
