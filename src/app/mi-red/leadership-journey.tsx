"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Award, Bike, Building2, CarFront, Check, CircleAlert, Flag, House, PersonStanding, Plane, Ship, Sparkles, Target, Trophy, Truck, UsersRound, Waves, X, type LucideIcon } from "lucide-react";

type Rank = {
  code: string;
  name: string;
  sortOrder: number;
  logoUrl: string | null;
  rewardName: string | null;
  rewardDescription: string | null;
  memberCount: number;
  directCount: number;
  directPoints: number;
  totalPoints: number;
  deadlineMonths: number;
};
type Metrics = { memberCount: number; directCount: number; directPoints: number; volumePoints: number };
type Requirement = { key: string; label: string; current: number; target: number; unit: string; hint: string };

const number = new Intl.NumberFormat("es-PE");
const rewardIcons: Record<string, LucideIcon> = { BRONZE: Waves, SILVER: Bike, GOLD: Plane, SAPPHIRE: Ship, RUBY: CarFront, EMERALD: Truck, PLATINUM: Building2, DIAMOND: House };

function requirementsFor(rank: Rank, metrics: Metrics): Requirement[] {
  return [
    { key: "members", label: "Socios en tu red", current: metrics.memberCount, target: rank.memberCount, unit: "socios", hint: "Personas elegibles de tu red hasta la octava generación." },
    { key: "directs", label: "Socios directos", current: metrics.directCount, target: rank.directCount, unit: "socios directos", hint: "Personas que patrocinaste directamente." },
    { key: "directPoints", label: "Puntos directos", current: metrics.directPoints, target: rank.directPoints, unit: "puntos directos", hint: "Se acreditan según las reglas de ventas directas elegibles." },
    { key: "volume", label: "Puntos de volumen", current: metrics.volumePoints, target: rank.totalPoints, unit: "puntos de volumen", hint: "Puntos de ventas activas de la red; no son dólares." },
  ];
}

function rankDeadline(affiliatedAt: string, months: number) {
  const deadline = new Date(affiliatedAt);
  deadline.setUTCMonth(deadline.getUTCMonth() + months);
  return deadline;
}

export function LeadershipJourney({ ranks, currentRank, metrics, salesCount, affiliatedAt, asOf }: { ranks: Rank[]; currentRank: string | null; metrics: Metrics; salesCount: number; affiliatedAt: string; asOf: string }) {
  const currentIndex = ranks.findIndex((rank) => rank.code === currentRank);
  const nextIndex = currentIndex >= 0 ? Math.min(currentIndex + 1, ranks.length - 1) : 0;
  const nextRank = ranks[nextIndex];
  const [selectedCode, setSelectedCode] = useState(nextRank?.code ?? "");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selected = ranks.find((rank) => rank.code === selectedCode) ?? nextRank;
  const opened = ranks.find((rank) => rank.code === openCode);

  useEffect(() => {
    if (!openCode) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenCode(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [openCode]);

  if (!selected || !nextRank) return null;
  const highestReached = currentIndex === ranks.length - 1;
  const nextRequirements = requirementsFor(nextRank, metrics);
  const requirements = requirementsFor(selected, metrics);
  const completed = nextRequirements.filter((item) => item.current >= item.target).length;
  const selectedCompleted = requirements.filter((item) => item.current >= item.target).length;
  const remainingMembers = Math.max(0, nextRank.memberCount - metrics.memberCount);
  const nextDeadline = rankDeadline(affiliatedAt, nextRank.deadlineMonths);
  const deadlinePassed = new Date(asOf).getTime() > nextDeadline.getTime();
  const deadlineLabel = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(nextDeadline);
  const nearNext = !highestReached && !deadlinePassed && nextRequirements.every((item) => item.current >= item.target * 0.8);
  const allNumericMet = completed === nextRequirements.length;
  const currentName = currentIndex >= 0 ? ranks[currentIndex].name : "Inicio";
  const nextReward = nextRank.rewardName ?? "Premio por definir";
  const headline = highestReached ? "¡Llegaste a Diamante!" : `Vas camino a ${nextRank.name}`;
  const summary = highestReached
    ? "Has alcanzado el último escalón de la carrera de liderazgo."
    : remainingMembers > 0
      ? `Tienes ${number.format(metrics.memberCount)} ${metrics.memberCount === 1 ? "socio" : "socios"} en tu red; te ${remainingMembers === 1 ? "falta" : "faltan"} ${number.format(remainingMembers)} para ${nextRank.name}.`
      : allNumericMet ? "Ya cumples las cuatro metas numéricas. El ascenso depende de la validación de las condiciones del rango." : `Ya cumples la meta de socios para ${nextRank.name}. Revisa los puntos y patrocinios pendientes.`;

  return <section className="module-panel portal-section leadership-journey" aria-labelledby="leadership-title">
    <div className="leadership-hero">
      <div className="leadership-climber" aria-hidden="true"><span /><span /><span /><span /><PersonStanding size={36} strokeWidth={2.4} /></div>
      <div className="leadership-intro"><span className="eyebrow">Club de Liderazgo · Ascenso a Diamante</span><h2 id="leadership-title">{headline}</h2><p>{summary}</p><div className="leadership-meta"><span><UsersRound size={15} aria-hidden="true" />{number.format(salesCount)} {salesCount === 1 ? "venta registrada" : "ventas registradas"} en tu red</span><span><Target size={15} aria-hidden="true" />{completed} de 4 metas cumplidas</span><span className={deadlinePassed && !highestReached ? "deadline-passed" : ""}><Flag size={15} aria-hidden="true" />Plazo del rango: {deadlineLabel}{deadlinePassed && !highestReached ? " · vencido" : ""}</span></div></div>
      <div className="leadership-next-prize"><span>Próximo premio</span><strong>{highestReached ? "Carrera completada" : nextReward}</strong><small>{highestReached ? "Reconocimiento máximo" : `Al alcanzar ${nextRank.name}`}</small></div>
    </div>

    {!highestReached && !deadlinePassed && (nearNext || allNumericMet) && <div className="leadership-milestone" role="status"><Sparkles size={20} aria-hidden="true" /><div><strong>{allNumericMet ? `¡Metas numéricas completas para ${nextRank.name}!` : `Estás cerca de ${nextRank.name}`}</strong><p>{allNumericMet ? `Tu siguiente reconocimiento es ${nextReward}. La acreditación depende del plazo y la validación administrativa.` : `Sigue avanzando hacia ${nextReward}. Revisa abajo qué requisitos te faltan; cada uno debe cumplirse.`}</p></div></div>}

    <div className="leadership-map-heading"><div><h3>Tu mapa de progresión</h3><p>Selecciona un rango para conocer su premio y las metas necesarias.</p></div><span>{currentName} → {highestReached ? "Diamante" : nextRank.name}</span></div>
    <div className="leadership-overall" role="group" aria-label="Rangos alcanzados"><progress max={ranks.length} value={Math.max(0, currentIndex + 1)} aria-label={`${Math.max(0, currentIndex + 1)} de ${ranks.length} rangos alcanzados`} /><span>{Math.max(0, currentIndex + 1)} / {ranks.length} rangos</span></div>
    <div className="leadership-rank-map" aria-label="Explorar rangos de liderazgo">{ranks.map((rank, index) => { const reached = currentIndex >= index; const isNext = !highestReached && index === nextIndex; const RewardIcon = rewardIcons[rank.code] ?? Award; return <button key={rank.code} type="button" data-rank={rank.code} className={`leadership-rank-card${reached ? " reached" : ""}${isNext ? " next" : ""}${selected.code === rank.code ? " selected" : ""}`} aria-label={`Ver ${rank.name}, premio ${rank.rewardName ?? "por definir"}${reached ? ", rango alcanzado" : isNext ? ", próximo rango" : ""}`} onClick={() => { setSelectedCode(rank.code); setOpenCode(rank.code); }}><span className="leadership-rank-state">{reached ? <><Check size={14} aria-hidden="true" /> Alcanzado</> : isNext ? <><Target size={14} aria-hidden="true" /> Próximo</> : `Nivel ${index + 1}`}</span><span className="leadership-rank-mark">{rank.logoUrl ? <Image src={rank.logoUrl} alt="" width={58} height={58} unoptimized /> : <Trophy size={27} aria-hidden="true" />}</span><strong>{rank.name}</strong><span className="leadership-reward"><RewardIcon size={18} aria-hidden="true" />{rank.rewardName ?? "Premio por definir"}</span><small>Ver premio y requisitos</small></button>; })}</div>

    <div className="leadership-detail"><div className="leadership-detail-heading"><div><h3>Tu avance hacia {selected.name}</h3><p>Las cuatro condiciones deben cumplirse; cada indicador se calcula por separado.</p></div><span className="leadership-completion">{selectedCompleted}/4 completas</span></div>
      <div className="leadership-requirements">{requirements.map((item) => { const left = Math.max(0, item.target - item.current); const met = left === 0; return <article className={met ? "leadership-requirement met" : "leadership-requirement"} key={item.key}><div className="leadership-requirement-top"><span>{item.label}</span>{met ? <Check size={17} aria-label="Meta cumplida" /> : <UsersRound size={17} aria-hidden="true" />}</div><strong>{number.format(item.current)} <span>/ {number.format(item.target)}</span></strong><progress max={Math.max(item.target, 1)} value={Math.min(item.current, Math.max(item.target, 1))} aria-label={`${item.label}: ${number.format(item.current)} de ${number.format(item.target)}`} /><b>{met ? "Meta cumplida" : `Faltan ${number.format(left)} ${item.unit}`}</b><small>{item.hint}</small></article>; })}</div>
      {deadlinePassed && !highestReached && selected.code === nextRank.code && <p className="leadership-deadline-note"><CircleAlert size={17} aria-hidden="true" />El plazo de este rango ya terminó. Cumplir las cifras no garantiza el ascenso automático; consulta a administración.</p>}
    </div>

    {opened && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenCode(null); }}><section className="member-dialog leadership-reward-dialog" role="dialog" aria-modal="true" aria-labelledby="leadership-reward-title" aria-describedby="leadership-reward-description"><div className="dialog-header"><div><span className="eyebrow">Club de Liderazgo · Nivel {opened.sortOrder}</span><h2 id="leadership-reward-title">{opened.name}</h2><p id="leadership-reward-description">{currentIndex >= ranks.indexOf(opened) ? "Rango alcanzado" : opened.code === nextRank.code ? "Tu próximo rango" : "Un escalón de tu carrera"}</p></div><button ref={closeRef} className="icon-button" type="button" aria-label="Cerrar detalle del rango" onClick={() => setOpenCode(null)}><X size={18} aria-hidden="true" /></button></div><div className="leadership-reward-dialog-body"><div className="leadership-reward-feature" data-rank={opened.code}>{opened.logoUrl ? <Image src={opened.logoUrl} alt="" width={76} height={76} unoptimized /> : <Trophy size={48} aria-hidden="true" />}<div><span>Premio de {opened.name}</span><strong>{opened.rewardName ?? "Premio por definir"}</strong><p>{opened.rewardDescription ?? "Administración publicará los detalles de este reconocimiento."}</p></div></div><h3>Requisitos para este rango</h3><ul>{requirementsFor(opened, metrics).map((item) => <li key={item.key}><span>{item.label}</span><strong>{number.format(item.current)} / {number.format(item.target)} {item.current >= item.target ? "· cumplido" : ""}</strong></li>)}</ul><p className="leadership-reward-disclaimer">Plazo desde la afiliación: {opened.deadlineMonths} meses, hasta el {new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(rankDeadline(affiliatedAt, opened.deadlineMonths))}. El premio se acredita al confirmar el rango según las reglas vigentes.</p></div></section></div>}
  </section>;
}
