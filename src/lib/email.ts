import "server-only";
import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

async function deliver(payload: { from: string; to: string; subject: string; html: string }) {
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
      await transporter.sendMail(payload);
      return { sent: true as const };
    }
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: payload.from, to: [payload.to], subject: payload.subject, html: payload.html }) });
    return response.ok ? { sent: true as const } : { sent: false as const, reason: "DELIVERY_FAILED" as const };
  } catch {
    return { sent: false as const, reason: "DELIVERY_FAILED" as const };
  }
}

export async function sendAccountInvitation(input: { email: string; name: string; token: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  if ((!apiKey && !smtpConfigured) || !from) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" as const };
  const activationUrl = `${appUrl}/activar-cuenta?token=${encodeURIComponent(input.token)}`;
  return deliver({ from, to: input.email, subject: "Activa tu cuenta de Malabrigo", html: `<p>Hola ${escapeHtml(input.name)},</p><p>Tu cuenta de Malabrigo fue creada. Usa el siguiente enlace para crear tu contraseña:</p><p><a href="${activationUrl}">Crear mi contraseña</a></p><p>El enlace vence en 24 horas y solo puede utilizarse una vez.</p>` });
}

export async function sendPasswordReset(input: { email: string; name: string; token: string }) {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM; const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  if ((!apiKey && !smtpConfigured) || !from) return { sent: false as const, reason: "EMAIL_NOT_CONFIGURED" as const };
  const url = `${appUrl}/restablecer-contrasena?token=${encodeURIComponent(input.token)}`;
  return deliver({ from, to: input.email, subject: "Restablece tu contraseña de Malabrigo", html: `<p>Hola ${escapeHtml(input.name)},</p><p>Solicitaste restablecer tu contraseña.</p><p><a href="${url}">Crear nueva contraseña</a></p><p>Este enlace vence en una hora. Si no hiciste esta solicitud, ignora este mensaje.</p>` });
}
