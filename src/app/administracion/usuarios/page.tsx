import { ShieldCheck, UsersRound } from "lucide-react";
import { MetricCard, PageHeader, StatusPill } from "@/components/module-ui";
import { requirePermission } from "@/lib/access-control";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { AdminPermissionsForm, AdminUserDialog } from "./admin-user-form";

export default async function AdminUsersPage() {
  await requirePermission("ADMIN_USERS");
  const [users, permissions] = await Promise.all([
    db.user.findMany({
      where: { roles: { some: { role: { code: { in: ["SUPERADMIN", "DIRECTION", "FINANCE", "COMMERCIAL", "SUPPORT", "CONSTRUCTION"] } } } } },
      include: { roles: { include: { role: true } }, permissions: { include: { permission: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.permission.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <><PageHeader eyebrow="Seguridad" title="Administración de usuarios" description="Crea administradores y define exactamente qué módulos pueden utilizar." action={<AdminUserDialog permissions={permissions} />} /><section className="module-metrics"><MetricCard label="Administradores" value={String(users.length)} detail="Cuentas administrativas" icon={UsersRound} /><MetricCard label="Permisos" value={String(permissions.length)} detail="Módulos controlados" icon={ShieldCheck} /><MetricCard label="Activos" value={String(users.filter((user) => user.status === "ACTIVE").length)} detail="Con acceso vigente" icon={ShieldCheck} /></section><section className="module-panel"><div className="module-toolbar"><div><h2>Usuarios administrativos</h2><p>Accesos y permisos asignados</p></div></div><div className="table-wrap module-table"><table><thead><tr><th>Usuario</th><th>Perfil</th><th>Permisos</th><th>Estado</th><th>Creado</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><br />{user.email}</td><td>{user.roles.map((entry) => entry.role.name).join(", ")}</td><td>{user.roles.some((entry) => entry.role.code === "SUPERADMIN") ? "Todos" : <><span>{user.permissions.map((entry) => entry.permission.name).join(", ") || "Sin permisos"}</span><AdminPermissionsForm userId={user.id} assigned={user.permissions.map((entry) => entry.permission.code)} permissions={permissions} /></>}</td><td><StatusPill tone={user.status === "ACTIVE" ? "success" : "warning"}>{user.status === "ACTIVE" ? "Activo" : "Invitado"}</StatusPill></td><td>{formatDate(user.createdAt)}</td></tr>)}</tbody></table></div></section></>;
}
