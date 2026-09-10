import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/module-ui";
import { getCurrentUser } from "@/lib/session";
import { ChangePasswordForm } from "../../auth-form";

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/iniciar-sesion");
  return <><PageHeader eyebrow="Mi cuenta" title="Seguridad" description={`Gestiona la contraseña de ${user.displayName}.`} /><section className="module-panel security-panel"><div className="module-toolbar"><div><h2><KeyRound size={17} /> Cambiar contraseña</h2><p>Al guardar se cerrarán las demás sesiones activas.</p></div></div><ChangePasswordForm /></section></>;
}
