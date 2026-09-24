"use client";

import { useTransition } from "react";
import { CloudOff, RotateCw } from "lucide-react";

export function ServiceUnavailable({ retry }: { retry?: () => void }) {
  const [pending, startTransition] = useTransition();

  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px", background: "radial-gradient(circle at 50% 0%, #123d56 0%, #071d2c 48%, #041522 100%)", color: "#f4f8fb", fontFamily: "Arial, sans-serif" }}>
    <style>{`.service-retry:hover:not(:disabled) { background: #ffda88 !important; border-color: #ffda88 !important; } .service-retry:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }`}</style>
    <section role="alert" aria-labelledby="service-unavailable-title" style={{ width: "min(100%, 480px)", padding: "clamp(24px, 5vw, 40px)", border: "1px solid rgba(229, 185, 96, .34)", borderRadius: "20px", background: "#103047", boxShadow: "0 24px 75px rgba(0, 0, 0, .35)", textAlign: "center" }}>
      <div style={{ width: "64px", height: "64px", display: "grid", placeItems: "center", margin: "0 auto 24px", border: "1px solid rgba(229, 185, 96, .5)", borderRadius: "18px", background: "rgba(229, 185, 96, .1)", color: "#f0c56d" }}><CloudOff size={30} aria-hidden="true" /></div>
      <p style={{ margin: "0 0 10px", color: "#f0c56d", fontSize: "12px", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Malabrigo Club Resort</p>
      <h1 id="service-unavailable-title" style={{ margin: "0 0 14px", fontSize: "clamp(26px, 5vw, 34px)", lineHeight: 1.2 }}>Servicio temporalmente no disponible</h1>
      <p style={{ margin: "0 0 28px", color: "#d4e2e9", fontSize: "16px", lineHeight: 1.6 }}>No podemos cargar tu información en este momento. Puede tratarse de una interrupción temporal del servidor. Espera unos minutos e inténtalo de nuevo.</p>
      <button className="service-retry" type="button" onClick={() => startTransition(() => retry ? retry() : window.location.reload())} disabled={pending} style={{ minHeight: "48px", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px 18px", border: "1px solid #efc46b", borderRadius: "10px", background: pending ? "#8d7549" : "#efc46b", color: "#071a28", fontSize: "15px", fontWeight: 800, cursor: pending ? "wait" : "pointer" }}><RotateCw size={18} aria-hidden="true" />{pending ? "Reintentando…" : "Reintentar"}</button>
      <p style={{ margin: "18px 0 0", color: "#b7cbd5", fontSize: "13px", lineHeight: 1.5 }}>Si el problema continúa, comunícate con administración.</p>
    </section>
  </main>;
}
