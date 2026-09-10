import Link from "next/link";
import { ActivationForm } from "../auth-form";
import { BrandLogo } from "@/components/brand-logo";

export default async function ActivateAccountPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><BrandLogo /></div><span className="eyebrow">Activación segura</span><h1>Crea tu contraseña</h1><p>Solo tú defines la contraseña de acceso. El enlace se puede usar una vez.</p>{token ? <ActivationForm token={token} /> : <div className="form-message error">El enlace de activación está incompleto.</div>}<Link className="auth-footer-link" href="/iniciar-sesion">Ir al inicio de sesión</Link></section></main>;
}
