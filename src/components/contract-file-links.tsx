import { Eye } from "lucide-react";

export function ContractFileLinks({ id, documentUrl, downloadable }: { id: string; documentUrl: string | null; downloadable: boolean }) {
  if (!documentUrl && !downloadable) return "Pendiente";
  return <div className="row-actions">{documentUrl && <a className="row-action row-action-icon" href={documentUrl} target="_blank" rel="noreferrer" aria-label="Ver contrato" title="Ver contrato"><Eye size={17} aria-hidden="true" /></a>}{downloadable && <><a className="row-action row-action-icon" href={`/contratos/archivo/${id}/pdf`} aria-label="Descargar PDF" title="Descargar PDF">PDF</a><a className="row-action row-action-icon" href={`/contratos/archivo/${id}/word`} aria-label="Descargar Word" title="Descargar Word">DOC</a></>}</div>;
}
