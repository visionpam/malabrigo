export function ContractFileLinks({ id, documentUrl, downloadable }: { id: string; documentUrl: string | null; downloadable: boolean }) {
  if (!documentUrl && !downloadable) return "Pendiente";
  return <div className="row-actions">{documentUrl && <a className="row-action" href={documentUrl} target="_blank" rel="noreferrer">Ver</a>}{downloadable && <><a className="row-action" href={`/contratos/archivo/${id}/pdf`}>PDF</a><a className="row-action" href={`/contratos/archivo/${id}/word`}>Word</a></>}</div>;
}
