import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let updated = 0;
try {
  const { rows } = await client.query("SELECT id, document_url FROM contracts WHERE document_text IS NULL AND document_url LIKE '/generated-contracts/%'");
  for (const contract of rows) {
    const fileName = contract.document_url.split("/").at(-1);
    if (!fileName || !/^[A-Za-z0-9_-]+\.html$/.test(fileName)) continue;
    let html;
    try { html = await readFile(path.join(process.cwd(), "public", "generated-contracts", fileName), "utf8"); }
    catch { continue; }
    const match = /<div>([\s\S]*?)<\/div><\/body>/i.exec(html);
    if (!match) continue;
    const text = match[1].replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/?strong>/gi, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const result = await client.query("UPDATE contracts SET document_text = $1, document_url = $2 WHERE id = $3 AND document_text IS NULL", [text, `/contratos/archivo/${contract.id}`, contract.id]);
    updated += result.rowCount ?? 0;
  }
  console.log(`Contratos históricos respaldados: ${updated}.`);
} finally {
  await client.end();
}
