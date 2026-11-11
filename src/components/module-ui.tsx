import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="module-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-actions">{action}</div>}</div>;
}

export function MetricCard({ label, value, detail, icon: Icon, href }: { label: string; value: string; detail: string; icon: LucideIcon; href?: string }) {
  const content = <><div className="kpi-icon"><Icon size={20} aria-hidden="true" /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></>;
  return href ? <a className="module-metric" href={href} aria-label={`${label}: ${value}. Ir a la sección`}>{content}</a> : <article className="module-metric">{content}</article>;
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="empty-state"><div><Icon size={25} /></div><strong>{title}</strong><p>{description}</p></div>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`module-status ${tone}`}>{children}</span>;
}
