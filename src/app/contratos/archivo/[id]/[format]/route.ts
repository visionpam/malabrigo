import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { accessibleContract } from "@/lib/contract-document";

export const runtime = "nodejs";

function drawWrapped(page: PDFPage, font: PDFFont, line: string, y: number, size: number) {
  const maxWidth = 512;
  let current = "";
  for (const word of line.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      page.drawText(current, { x: 50, y, size, font, color: rgb(0.09, 0.13, 0.17) });
      y -= 17;
      current = word;
    } else current = candidate;
  }
  if (current) { page.drawText(current, { x: 50, y, size, font, color: rgb(0.09, 0.13, 0.17) }); y -= 17; }
  return y;
}

async function makePdf(title: string, meta: string, content: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 738;
  page.drawText(title, { x: 50, y, size: 18, font: bold, color: rgb(0.02, 0.15, 0.24), maxWidth: 512 });
  y -= 29;
  page.drawText(meta, { x: 50, y, size: 9, font: normal, color: rgb(0.35, 0.4, 0.44), maxWidth: 512 });
  y -= 35;
  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    if (y < 65) { page = pdf.addPage([612, 792]); y = 738; }
    if (!line.trim()) { y -= 13; continue; }
    const words = line.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (normal.widthOfTextAtSize(candidate, 11) > 512 && current) {
        y = drawWrapped(page, normal, current, y, 11);
        if (y < 65) { page = pdf.addPage([612, 792]); y = 738; }
        current = word;
      } else current = candidate;
    }
    if (current) y = drawWrapped(page, normal, current, y, 11);
  }
  return pdf.save();
}

async function makeWord(title: string, meta: string, content: string) {
  const paragraphs = content.replace(/\r\n/g, "\n").split("\n").map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: line ? 100 : 180 } }));
  const document = new Document({ sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 160 } }), new Paragraph({ text: meta, spacing: { after: 400 } }), ...paragraphs] }] });
  return Packer.toBuffer(document);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string; format: string }> }) {
  const { id, format } = await context.params;
  if (format !== "pdf" && format !== "word") return new Response("Formato no disponible", { status: 404 });
  const { status, contract } = await accessibleContract(id);
  if (!contract) return new Response(status === 401 ? "Inicia sesión" : "Contrato no disponible", { status });
  if (!contract.documentText) return new Response("Este contrato anterior no tiene una copia guardada para descargar.", { status: 404 });
  const title = contract.template.name;
  const meta = `${contract.template.code} - versión ${contract.template.version} - ${contract.sale.code}`;
  let bytes: Uint8Array;
  try { bytes = format === "pdf" ? await makePdf(title, meta, contract.documentText) : new Uint8Array(await makeWord(title, meta, contract.documentText)); }
  catch { return new Response("El documento contiene caracteres que no pudieron convertirse a este formato.", { status: 422 }); }
  const extension = format === "pdf" ? "pdf" : "docx";
  const mime = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const safeCode = contract.sale.code.replace(/[^A-Za-z0-9_-]/g, "-");
  return new Response(Uint8Array.from(bytes), { headers: { "Content-Type": mime, "Content-Disposition": `attachment; filename="contrato-${safeCode}.${extension}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
