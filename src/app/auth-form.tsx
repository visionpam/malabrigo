"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound, LoaderCircle, LogIn, Mail } from "lucide-react";
import type { AuthState } from "./auth-actions";
import { activateAccountAction, changePasswordAction, loginAction, requestPasswordResetAction, resetPasswordAction } from "./auth-actions";

const initialState: AuthState = { success: false, message: "" };

function Message({ state }: { state: AuthState }) {
  return state.message ? <p className={`form-message ${state.success ? "success" : "error"}`} role="status">{state.message}</p> : null;
}

function PasswordFields({ includeCurrent = false }: { includeCurrent?: boolean }) {
  return <>
    {includeCurrent && <label><span>Contraseña actual</span><input name="currentPassword" type="password" autoComplete="current-password" required /></label>}
    <label><span>Nueva contraseña</span><input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
    <label><span>Confirmar contraseña</span><input name="confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
    <small className="password-hint">Mínimo 10 caracteres, con una letra, un número y un símbolo.</small>
  </>;
}

export function ActivationForm({ token }: { token: string }) {
  const action = activateAccountAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction} className="auth-form"><PasswordFields /><Message state={state} /><button className="primary-button auth-submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <KeyRound size={17} />}{pending ? "Activando..." : "Crear contraseña y activar"}</button></form>;
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return <form action={formAction} className="auth-form"><label><span>Correo o código personal</span><input name="identifier" autoComplete="username" required /></label><label><span>Contraseña</span><input name="password" type="password" autoComplete="current-password" required /></label><Message state={state} /><button className="primary-button auth-submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <LogIn size={17} />}{pending ? "Ingresando..." : "Iniciar sesión"}</button><Link href="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link></form>;
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);
  return <form action={formAction} className="auth-form"><label><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" required /></label><Message state={state} /><button className="primary-button auth-submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <Mail size={17} />}{pending ? "Enviando..." : "Enviar enlace"}</button><Link href="/iniciar-sesion">Volver al inicio de sesión</Link></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const action = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction} className="auth-form"><PasswordFields /><Message state={state} /><button className="primary-button auth-submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <KeyRound size={17} />}{pending ? "Guardando..." : "Guardar nueva contraseña"}</button></form>;
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  return <form action={formAction} className="auth-form account-password-form"><PasswordFields includeCurrent /><Message state={state} /><button className="primary-button auth-submit" disabled={pending}>{pending ? <LoaderCircle className="spinner" size={17} /> : <KeyRound size={17} />}{pending ? "Actualizando..." : "Cambiar contraseña"}</button></form>;
}
