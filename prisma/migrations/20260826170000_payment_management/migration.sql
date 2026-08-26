CREATE TYPE "PaymentConcept" AS ENUM ('SEPARATION', 'DOWN_PAYMENT', 'INSTALLMENT', 'OTHER');

ALTER TABLE "payments"
  ADD COLUMN "concept" "PaymentConcept" NOT NULL DEFAULT 'OTHER';

CREATE INDEX "payments_sale_id_concept_status_idx"
  ON "payments"("sale_id", "concept", "status");
