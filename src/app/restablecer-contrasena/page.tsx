import Link from "next/link";
import { ResetPasswordForm } from "../auth-form";
import { BrandLogo } from "@/components/brand-logo";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><BrandLogo /></div><span className="eyebrow">Seguridad</span><h1>Nueva contraseña</h1><p>Este enlace vence una hora después de ser solicitado.</p>{token ? <ResetPasswordForm token={token} /> : <div className="form-message error">El enlace de recuperación está incompleto.</div>}<Link className="auth-footer-link" href="/iniciar-sesion">Volver al inicio de sesión</Link></section></main>;
}
