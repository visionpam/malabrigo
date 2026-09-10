import { ForgotPasswordForm } from "../auth-form";
import { BrandLogo } from "@/components/brand-logo";

export default function ForgotPasswordPage() {
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><BrandLogo /></div><span className="eyebrow">Recuperación de acceso</span><h1>Restablece tu contraseña</h1><p>Te enviaremos un enlace de seguridad si el correo está registrado.</p><ForgotPasswordForm /></section></main>;
}
