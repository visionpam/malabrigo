"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronRight, CircleAlert, Flag, Target, Trophy, UsersRound } from "lucide-react";

type Rank = {
  code: string;
  name: string;
  sortOrder: number;
  logoUrl: string | null;
  memberCount: number;
  directCount: number;
  directPoints: number;
  totalPoints: number;
  deadlineMonths: number;
};
type Metrics = { memberCount: number; directCount: number; directPoints: number; volumePoints: number };
type Requirement = { key: string; label: string; current: number; target: number; unit: string; hint: string };

const number = new Intl.NumberFormat("es-PE");
export function LeadershipJourney({ ranks, currentRank, metrics, salesCount, affiliatedAt, asOf }: { ranks: Rank[]; currentRank: string | null; metrics: Metrics; salesCount: number; affiliatedAt: string; asOf: string }) {
  const currentIndex = ranks.findIndex((rank) => rank.code === currentRank);
  const nextIndex = currentIndex >= 0 ? Math.min(currentIndex + 1, ranks.length - 1) : 0;
  const [selectedCode, setSelectedCode] = useState(ranks[nextIndex]?.code ?? "");
  const selected = ranks.find((rank) => rank.code === selectedCode) ?? ranks[nextIndex];
  if (!selected) return null;

  const isNext = selected.code === ranks[nextIndex]?.code && currentIndex < ranks.length - 1;
  const highestReached = currentIndex === ranks.length - 1;
  const isAchieved = currentIndex >= 0 && selected.sortOrder <= ranks[currentIndex].sortOrder;
  const requirements: Requirement[] = [
    { key: "members", label: "Socios en tu red", current: metrics.memberCount, target: selected.memberCount, unit: "socios", hint: "Personas de tu red hasta la octava generación." },
    { key: "directs", label: "Socios directos", current: metrics.directCount, target: selected.directCount, unit: "socios directos", hint: "Personas que patrocinaste directamente." },
    { key: "directPoints", label: "Puntos directos", current: metrics.directPoints, target: selected.directPoints, unit: "puntos directos", hint: "Se acreditan según las reglas de ventas directas elegibles." },
    { key: "volume", label: "Puntos de volumen", current: metrics.volumePoints, target: selected.totalPoints, unit: "puntos de volumen", hint: "Puntos de ventas activas de tu red; no son dólares." },
  ];
  const completed = requirements.filter((item) => item.current >= item.target).length;
  const remainingMembers = Math.max(0, selected.memberCount - metrics.memberCount);
  const deadline = new Date(affiliatedAt);
  deadline.setUTCMonth(deadline.getUTCMonth() + selected.deadlineMonths);
  const deadlinePassed = new Date(asOf).getTime() > deadline.getTime();
  const deadlineLabel = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(deadline);
  const headline = highestReached && isAchieved ? "¡Llegaste a Diamante!" : isNext ? `Vas camino a ${selected.name}` : isAchieved ? `Ya alcanzaste ${selected.name}` : `Explora el rango ${selected.name}`;
  const summary = remainingMembers > 0
    ? `Tienes ${number.format(metrics.memberCount)} ${metrics.memberCount === 1 ? "socio" : "socios"} en tu red; te ${remainingMembers === 1 ? "falta" : "faltan"} ${number.format(remainingMembers)} para ${selected.name}.`
    : completed === requirements.length ? "Ya cumples las cuatro metas numéricas de este rango." : `Ya cumples la meta de socios para ${selected.name}. Revisa los puntos y patrocinios pendientes.`;

  return <section className="module-panel portal-section leadership-journey" aria-labelledby="leadership-title">
    <div className="leadership-hero">
      <div className="leadership-emblem" aria-hidden="true">{selected.logoUrl ? <Image src={selected.logoUrl} alt="" width={78} height={78} unoptimized /> : <Trophy size={32} />}</div>
      <div className="leadership-intro"><span className="eyebrow">Carrera de liderazgo</span><h2 id="leadership-title">{headline}</h2><p>{summary}</p><div className="leadership-meta"><span><UsersRound size={15} />{number.format(salesCount)} {salesCount === 1 ? "venta registrada" : "ventas registradas"} en tu red</span><span><Target size={15} />{completed} de 4 metas cumplidas</span><span className={deadlinePassed && !isAchieved ? "deadline-passed" : ""}><Flag size={15} />Plazo del rango: {deadlineLabel}{deadlinePassed && !isAchieved ? " · vencido" : ""}</span></div></div>
    </div>
    <div className="leadership-rail" aria-label="Explorar rangos de liderazgo">{ranks.map((rank, index) => { const reached = currentIndex >= index; const selectedRank = selected.code === rank.code; return <button key={rank.code} type="button" className={`leadership-step${selectedRank ? " selected" : ""}${reached ? " reached" : ""}`} aria-pressed={selectedRank} onClick={() => setSelectedCode(rank.code)}><span className="leadership-step-number">{reached ? <Check size={14} /> : index + 1}</span><span>{rank.name}</span>{index < ranks.length - 1 && <ChevronRight className="leadership-chevron" size={15} aria-hidden="true" />}</button>; })}</div>
    <div className="leadership-detail"><div className="leadership-detail-heading"><div><h3>Tu avance hacia {selected.name}</h3><p>Las cuatro condiciones deben cumplirse; cada indicador se calcula por separado.</p></div><span className="leadership-completion">{completed}/4 completas</span></div>
      <div className="leadership-requirements">{requirements.map((item) => { const left = Math.max(0, item.target - item.current); const met = left === 0; return <article className={met ? "leadership-requirement met" : "leadership-requirement"} key={item.key}><div className="leadership-requirement-top"><span>{item.label}</span>{met ? <Check size={17} aria-label="Meta cumplida" /> : <UsersRound size={17} aria-hidden="true" />}</div><strong>{number.format(item.current)} <span>/ {number.format(item.target)}</span></strong><progress max={Math.max(item.target, 1)} value={Math.min(item.current, Math.max(item.target, 1))} aria-label={`${item.label}: ${number.format(item.current)} de ${number.format(item.target)}`} /><b>{met ? "Meta cumplida" : `Faltan ${number.format(left)} ${item.unit}`}</b><small>{item.hint}</small></article>; })}</div>
      {deadlinePassed && !isAchieved && <p className="leadership-deadline-note"><CircleAlert size={17} />El plazo de este rango ya terminó. Cumplir las cifras no garantiza el ascenso automático; consulta a administración.</p>}
    </div>
  </section>;
}
