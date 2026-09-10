"use client";

import { useActionState } from "react";
import { BadgeCheck, LoaderCircle, XCircle } from "lucide-react";
import { approveSubmissionAction, rejectSubmissionAction, type PaymentActionState } from "./actions";

const initialState: PaymentActionState = { success: false, message: "" };

export function SubmissionReview({ id }: { id: string }) {
  const [approveState, approve, approving] = useActionState(approveSubmissionAction.bind(null, id), initialState);
  const [rejectState, reject, rejecting] = useActionState(rejectSubmissionAction.bind(null, id), initialState);
  const state = approveState.message ? approveState : rejectState;
  return <div className="submission-review"><form action={approve}><button className="row-action approve" type="submit" disabled={approving || rejecting}>{approving ? <LoaderCircle className="spinner" size={14} /> : <BadgeCheck size={14} />} Aprobar</button></form><form action={reject}><input name="reason" required minLength={5} maxLength={500} placeholder="Motivo si se rechaza" /><button className="row-action danger" type="submit" disabled={approving || rejecting}>{rejecting ? <LoaderCircle className="spinner" size={14} /> : <XCircle size={14} />} Rechazar</button></form>{state.message && <small className={state.success ? "success-text" : "field-error"}>{state.message}</small>}</div>;
}
