import Link from "next/link";
import { KeyRound, UserRound } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/module-ui";
import { requireUser } from "@/lib/access-control";
import { db } from "@/lib/db";
import { ProfileForm } from "./profile-form";

export default async function MyAccountPage() {
  const user = await requireUser();
  const [countries, occupations, regions, provinces, districts] = await Promise.all([
    db.country.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true } }),
    db.occupationOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true } }),
    db.addressRegion.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true, countryCode: true } }),
    db.addressProvince.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true, regionCode: true } }),
    db.addressDistrict.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { code: true, name: true, provinceCode: true } }),
  ]);
  return <><PageHeader eyebrow="Cuenta personal" title="Mi cuenta" description="Consulta tu identidad y actualiza tus datos de contacto." action={<Link className="primary-button" href="/mi-cuenta/seguridad"><KeyRound size={17} /> Cambiar contraseña</Link>} />
    <section className="module-panel security-panel"><div className="module-toolbar"><div><h2><UserRound size={17} /> Datos personales</h2><p>El código, documento y perfiles solo pueden ser modificados por administración.</p></div></div>{user.member ? <><section className="account-identity"><div><span>Nombre</span><strong>{user.member.firstName} {user.member.lastName}</strong></div><div><span>Código personal</span><strong>{user.member.memberCode}</strong></div><div><span>Documento</span><strong>{user.member.documentType} {user.member.documentNumber}</strong></div></section><ProfileForm countries={countries} occupations={occupations} regions={regions} provinces={provinces.map((item) => ({ ...item, parentCode: item.regionCode }))} districts={districts.map((item) => ({ ...item, parentCode: item.provinceCode }))} profile={{ email: user.member.email, phone: user.member.phone ?? "", countryCode: user.member.countryCode, regionCode: user.member.regionCode, provinceCode: user.member.provinceCode, districtCode: user.member.districtCode, residence: user.member.residence ?? "", occupation: user.member.occupation ?? "" }} /></> : <EmptyState icon={UserRound} title="Cuenta administrativa" description="Esta cuenta no tiene un expediente de socio asociado. Puedes gestionar tu contraseña desde el botón superior." />}</section>
  </>;
}
