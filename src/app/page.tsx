import Link from "next/link";
import {
  ArrowUpRight, CalendarDays, ChevronDown, CircleDollarSign, FileCheck2,
  HardHat, MoreHorizontal, ReceiptText, ShieldCheck, TrendingUp, Upload,
  UserRoundPlus, UsersRound,
} from "lucide-react";

const kpis = [
  { label: "Socios activos", value: "1,245", detail: "+8.6% este mes", icon: UsersRound },
  { label: "Cobrado este mes", value: "$24,780", detail: "+12.5% vs. julio", icon: CircleDollarSign },
  { label: "Vouchers pendientes", value: "8", detail: "3 requieren atención", icon: ReceiptText },
  { label: "Acciones disponibles", value: "1.88M", detail: "83.7% del total", icon: ShieldCheck },
];

const payments = [
  { member: "María Torres", program: "Familiar", amount: "$1,000", date: "26 ago, 09:42", status: "Por validar" },
  { member: "Carlos Mendoza", program: "VIP", amount: "$2,500", date: "26 ago, 08:16", status: "Por validar" },
  { member: "Andrea Silva", program: "Premium", amount: "$600", date: "25 ago, 18:30", status: "Aprobado" },
  { member: "Luis Ramírez", program: "Plus", amount: "$200", date: "25 ago, 16:05", status: "Observado" },
];

const bars = [42, 55, 48, 72, 64, 81, 76, 92, 68, 84, 96, 88];

export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">Panel ejecutivo</span><h1>Buenos días, Johanna</h1><p>Este es el estado de la operación de Malabrigo hoy.</p></div>
        <div className="heading-actions">
          <button className="date-button"><CalendarDays size={17} /> Agosto 2026 <ChevronDown size={15} /></button>
          <Link className="primary-button" href="/socios"><UserRoundPlus size={17} /> Nuevo socio</Link>
        </div>
      </div>

      <section className="kpi-grid" aria-label="Indicadores principales">
        {kpis.map(({ label, value, detail, icon: Icon }) => (
          <article className="kpi-card" key={label}><div className="kpi-icon"><Icon size={21} /></div><div className="kpi-content"><span>{label}</span><strong>{value}</strong><small><TrendingUp size={13} />{detail}</small></div><MoreHorizontal className="kpi-menu" size={18} /></article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel revenue-panel">
          <div className="panel-header"><div><span className="panel-kicker">Flujo financiero</span><h2>Ingresos confirmados</h2></div><button className="text-button">Últimos 12 meses <ChevronDown size={14} /></button></div>
          <div className="revenue-summary"><strong>$184,260</strong><span><ArrowUpRight size={14} /> 18.2%</span></div>
          <div className="bar-chart" aria-label="Gráfico de ingresos mensuales">{bars.map((height, index) => <div className="bar-column" key={index}><i style={{ height: `${height}%` }} /><span>{"EFMAMJJASOND"[index]}</span></div>)}</div>
        </article>

        <article className="panel project-panel">
          <div className="panel-header"><div><span className="panel-kicker">Proyecto</span><h2>Avance de obra</h2></div><MoreHorizontal size={18} /></div>
          <div className="progress-ring" style={{ "--progress": "18%" } as React.CSSProperties}><div><strong>18%</strong><span>general</span></div></div>
          <div className="stage-copy"><strong>Preventa y preparación</strong><span>Próximo hito: inicio de desarrollo</span><small>Enero 2027</small></div>
          <Link className="secondary-button" href="/avance-obra"><Upload size={16} /> Ver avance</Link>
        </article>

        <article className="panel payments-panel">
          <div className="panel-header"><div><span className="panel-kicker">Finanzas</span><h2>Comprobantes recientes</h2></div><Link className="text-link" href="/pagos">Ver todos <ArrowUpRight size={14} /></Link></div>
          <div className="table-wrap"><table><thead><tr><th>Socio</th><th>Programa</th><th>Monto</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{payments.map((payment) => <tr key={`${payment.member}-${payment.date}`}><td><div className="member-cell"><span>{payment.member.split(" ").map((part) => part[0]).join("")}</span><strong>{payment.member}</strong></div></td><td>{payment.program}</td><td className="money">{payment.amount}</td><td>{payment.date}</td><td><span className={`status ${payment.status.toLowerCase().replace(" ", "-")}`}>{payment.status}</span></td></tr>)}</tbody></table></div>
        </article>

        <article className="panel actions-panel">
          <div className="panel-header"><div><span className="panel-kicker">Atención requerida</span><h2>Acciones pendientes</h2></div></div>
          <div className="action-list">
            <Link href="/pagos"><span className="action-icon orange"><ReceiptText size={17} /></span><div><strong>Validar comprobantes</strong><small>Finanzas</small></div><ArrowUpRight size={16} /></Link>
            <Link href="/socios"><span className="action-icon blue"><FileCheck2 size={17} /></span><div><strong>Revisar expedientes</strong><small>Soporte</small></div><ArrowUpRight size={16} /></Link>
            <Link href="/avance-obra"><span className="action-icon green"><HardHat size={17} /></span><div><strong>Publicar avance mensual</strong><small>Obra</small></div><ArrowUpRight size={16} /></Link>
          </div>
        </article>
      </section>
    </>
  );
}
