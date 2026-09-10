import Link from "next/link";
import { KeyRound, UserRound } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { ProfileForm } from "./profile-form";

export default async function MyAccountPage() {
  const user = await requireUser();
  return <><PageHeader eyebrow="Cuenta personal" title="Mi cuenta" description="Consulta tu identidad y actualiza tus datos de contacto." action={<Link className="primary-button" href="/mi-cuenta/seguridad"><KeyRound size={17} /> Cambiar contraseña</Link>} />
    <section className="module-panel security-panel"><div className="module-toolbar"><div><h2><UserRound size={17} /> Datos personales</h2><p>El código, documento y perfiles solo pueden ser modificados por administración.</p></div></div>{user.member ? <><section className="account-identity"><div><span>Nombre</span><strong>{user.member.firstName} {user.member.lastName}</strong></div><div><span>Código personal</span><strong>{user.member.memberCode}</strong></div><div><span>Documento</span><strong>{user.member.documentType} {user.member.documentNumber}</strong></div></section><ProfileForm profile={{ email: user.member.email, phone: user.member.phone ?? "", countryCode: user.member.countryCode, residence: user.member.residence ?? "", occupation: user.member.occupation ?? "" }} /></> : <EmptyState icon={UserRound} title="Cuenta administrativa" description="Esta cuenta no tiene un expediente de socio asociado. Puedes gestionar tu contraseña desde el botón superior." />}</section>
  </>;
}
