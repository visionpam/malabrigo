import { LoginForm } from "../auth-form";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><BrandLogo /></div><span className="eyebrow">Acceso a la plataforma</span><h1>Bienvenido</h1><p>Ingresa con tu correo o con el código personal de siete dígitos.</p><LoginForm /></section></main>;
}
