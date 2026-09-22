import "server-only";
import nodemailer from "nodemailer";

type EmailPayload = { from: string; to: string; subject: string; html: string };
type DeliveryResult =
  | { sent: true }
  | { sent: false; reason: "EMAIL_NOT_CONFIGURED" | "SMTP_DELIVERY_FAILED" | "API_DELIVERY_FAILED" };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function smtpConfiguration() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true",
    auth: { user, pass: password },
  };
}

function applicationUrl() {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

function reportDeliveryError(provider: "smtp" | "resend", error: unknown) {
  const details = error && typeof error === "object" ? error as {
    code?: unknown;
    command?: unknown;
    responseCode?: unknown;
    message?: unknown;
  } : null;

  // No se registran destinatarios, contraseñas, tokens ni contenido del mensaje.
  console.error("[email] Error de entrega", {
    provider,
    code: typeof details?.code === "string" ? details.code : undefined,
    command: typeof details?.command === "string" ? details.command : undefined,
    responseCode: typeof details?.responseCode === "number" ? details.responseCode : undefined,
    message: typeof details?.message === "string" ? details.message : "Error desconocido",
  });
}

async function deliver(payload: EmailPayload): Promise<DeliveryResult> {
  const smtp = smtpConfiguration();
  if (smtp) {
    try {
      const transporter = nodemailer.createTransport({
        ...smtp,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 25_000,
        tls: { servername: smtp.host, minVersion: "TLSv1.2" },
      });
      await transporter.sendMail(payload);
      return { sent: true };
    } catch (error) {
      reportDeliveryError("smtp", error);
      return { sent: false, reason: "SMTP_DELIVERY_FAILED" };
    }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: payload.from, to: [payload.to], subject: payload.subject, html: payload.html }),
    });
    if (response.ok) return { sent: true };
    reportDeliveryError("resend", new Error(`HTTP ${response.status}`));
    return { sent: false, reason: "API_DELIVERY_FAILED" };
  } catch (error) {
    reportDeliveryError("resend", error);
    return { sent: false, reason: "API_DELIVERY_FAILED" };
  }
}

export async function sendAccountInvitation(input: { email: string; name: string; token: string }): Promise<DeliveryResult> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  const activationUrl = `${applicationUrl()}/activar-cuenta?token=${encodeURIComponent(input.token)}`;
  return deliver({ from, to: input.email, subject: "Activa tu cuenta de Malabrigo", html: `<p>Hola ${escapeHtml(input.name)},</p><p>Tu cuenta de Malabrigo fue creada. Usa el siguiente enlace para crear tu contraseña:</p><p><a href="${activationUrl}">Crear mi contraseña</a></p><p>El enlace vence en 24 horas y solo puede utilizarse una vez.</p>` });
}

export async function sendPasswordReset(input: { email: string; name: string; token: string }): Promise<DeliveryResult> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  const url = `${applicationUrl()}/restablecer-contrasena?token=${encodeURIComponent(input.token)}`;
  return deliver({ from, to: input.email, subject: "Restablece tu contraseña de Malabrigo", html: `<p>Hola ${escapeHtml(input.name)},</p><p>Solicitaste restablecer tu contraseña.</p><p><a href="${url}">Crear nueva contraseña</a></p><p>Este enlace vence en una hora. Si no hiciste esta solicitud, ignora este mensaje.</p>` });
}
