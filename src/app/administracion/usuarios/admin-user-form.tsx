"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserPlus, X } from "lucide-react";
import { createAdminUserAction, type AdminUserState, updateAdminPermissionsAction } from "./actions";

function AdminUserForm({ permissions, onCreated }: { permissions: { id: string; code: string; name: string }[]; onCreated: () => void }) {
  const [state, action, pending] = useActionState(createAdminUserAction, { success: false, message: "" } satisfies AdminUserState);
  const router = useRouter();
  useEffect(() => { if (state.success) { router.refresh(); onCreated(); } }, [onCreated, router, state.success]);
  return <form action={action} className="member-form admin-user-form"><div className="form-grid"><label><span>Nombre completo *</span><input name="displayName" autoComplete="name" required /></label><label><span>Correo corporativo *</span><input name="email" type="email" autoComplete="email" required /></label><fieldset className="permission-grid form-wide"><legend>Permisos del administrador</legend>{permissions.map((permission) => <label key={permission.id} className="check-field"><input type="checkbox" name="permissions" value={permission.code} /><strong>{permission.name}</strong></label>)}</fieldset></div>{state.message && <p className={`form-message ${state.success ? "success" : "error"}`}>{state.message}</p>}<div className="dialog-actions"><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <UserPlus size={17} />}{pending ? "Creando..." : "Crear administrador"}</button></div></form>;
}

export function AdminUserDialog({ permissions }: { permissions: { id: string; code: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return <><button className="primary-button" onClick={() => setOpen(true)}><UserPlus size={17} /> Nuevo administrador</button>{open && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="member-dialog admin-user-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-user-title"><div className="dialog-header"><div><span className="eyebrow">Control de acceso</span><h2 id="admin-user-title">Nuevo administrador</h2><p>Define sus datos y los módulos que podrá utilizar. Recibirá un enlace para crear su contraseña.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div><AdminUserForm permissions={permissions} onCreated={() => setOpen(false)} /></section></div>}</>;
}

export function AdminPermissionsForm({ userId, assigned, permissions }: { userId: string; assigned: string[]; permissions: { id: string; code: string; name: string }[] }) {
  const action = updateAdminPermissionsAction.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, { success: false, message: "" } satisfies AdminUserState);
  return <details className="permission-editor"><summary>Editar permisos</summary><form action={formAction}><div>{permissions.map((permission) => <label key={permission.id} className="check-field"><input type="checkbox" name="permissions" value={permission.code} defaultChecked={assigned.includes(permission.code)} /><span>{permission.name}</span></label>)}</div><button className="row-action" disabled={pending}>{pending ? "Guardando..." : "Guardar permisos"}</button>{state.message && <small className={state.success ? "success-text" : "field-error"}>{state.message}</small>}</form></details>;
}
