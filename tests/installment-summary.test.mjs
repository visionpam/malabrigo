import assert from "node:assert/strict";
import test from "node:test";
import { summarizeInstallments } from "../src/lib/installment-summary.ts";

test("las cuotas pendientes son el complemento de las completadas", () => {
  assert.deepEqual(summarizeInstallments([
    { status: "PAID" }, { status: "PAID" }, { status: "PENDING" },
    { status: "IN_REVIEW" }, { status: "OVERDUE" },
  ]), { total: 5, completed: 2, pending: 3 });
});

test("las cuotas anuladas no cuentan en el total ni como pendientes", () => {
  assert.deepEqual(summarizeInstallments([
    { status: "PAID" }, { status: "CANCELLED" }, { status: "PENDING" },
  ]), { total: 2, completed: 1, pending: 1 });
  assert.deepEqual(summarizeInstallments([]), { total: 0, completed: 0, pending: 0 });
});
