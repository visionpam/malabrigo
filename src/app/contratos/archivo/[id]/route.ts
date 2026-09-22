import { accessibleContract } from "@/lib/contract-document";

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!)); }

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { status, contract } = await accessibleContract(id);
  if (!contract) return new Response(status === 401 ? "Inicia sesión" : "Contrato no disponible", { status });
  if (!contract.documentText) return new Response("Este contrato anterior no tiene una copia guardada para visualizar desde la base de datos.", { status: 404 });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(contract.template.name)}</title><style>body{font:16px/1.65 Arial,sans-serif;max-width:820px;margin:48px auto;padding:0 30px;color:#17212b}h1{color:#05263d}.meta{color:#5a6770}.content{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(contract.template.name)}</h1><p class="meta">${escapeHtml(contract.template.code)} · versión ${contract.template.version} · ${escapeHtml(contract.sale.code)}</p><div class="content">${escapeHtml(contract.documentText)}</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
