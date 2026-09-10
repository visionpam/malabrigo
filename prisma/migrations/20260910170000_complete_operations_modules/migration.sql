CREATE TYPE "DocumentCategory" AS ENUM ('IDENTITY', 'SEPARATION_FORM', 'SEPARATION_PROOF', 'SALE_PROOF', 'SIGNED_CONTRACT', 'ANNEX', 'RENDER', 'PROJECT', 'TIMELINE', 'CONSTRUCTION_PROGRESS', 'CABINS', 'PLANS', 'CONTRACT_MODEL', 'OTHER');
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE_MEMBER', 'ALL_MEMBERS', 'ADMIN_ONLY');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "rank_definitions"
  ADD COLUMN "reward_description" VARCHAR(400),
  ADD COLUMN "reward_name" VARCHAR(140);

CREATE TABLE "document_records" (
  "id" UUID NOT NULL,
  "member_id" UUID,
  "sale_id" UUID,
  "uploaded_by_id" UUID,
  "category" "DocumentCategory" NOT NULL,
  "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE_MEMBER',
  "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
  "title" VARCHAR(180) NOT NULL,
  "url" TEXT NOT NULL,
  "rejection_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ(6),
  CONSTRAINT "document_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rank_bonus_payments" (
  "id" UUID NOT NULL,
  "ambassador_id" UUID NOT NULL,
  "rank_code" VARCHAR(30) NOT NULL,
  "period" DATE NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rank_bonus_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rank_awards" (
  "id" UUID NOT NULL,
  "ambassador_id" UUID NOT NULL,
  "rank_code" VARCHAR(30) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'EARNED',
  "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMPTZ(6),
  "notes" VARCHAR(500),
  CONSTRAINT "rank_awards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_records_member_id_category_idx" ON "document_records"("member_id", "category");
CREATE INDEX "document_records_visibility_status_idx" ON "document_records"("visibility", "status");
CREATE INDEX "rank_bonus_payments_status_period_idx" ON "rank_bonus_payments"("status", "period");
CREATE UNIQUE INDEX "rank_bonus_payments_ambassador_id_period_key" ON "rank_bonus_payments"("ambassador_id", "period");
CREATE INDEX "rank_awards_status_idx" ON "rank_awards"("status");
CREATE UNIQUE INDEX "rank_awards_ambassador_id_rank_code_key" ON "rank_awards"("ambassador_id", "rank_code");
CREATE UNIQUE INDEX "commission_entries_ambassador_id_source_payment_id_generation_key" ON "commission_entries"("ambassador_id", "source_payment_id", "generation");

ALTER TABLE "document_records" ADD CONSTRAINT "document_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rank_bonus_payments" ADD CONSTRAINT "rank_bonus_payments_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassador_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rank_bonus_payments" ADD CONSTRAINT "rank_bonus_payments_rank_code_fkey" FOREIGN KEY ("rank_code") REFERENCES "rank_definitions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rank_awards" ADD CONSTRAINT "rank_awards_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassador_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rank_awards" ADD CONSTRAINT "rank_awards_rank_code_fkey" FOREIGN KEY ("rank_code") REFERENCES "rank_definitions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "rank_definitions" SET "reward_name" = CASE "code"
  WHEN 'BRONZE' THEN 'Resort nacional'
  WHEN 'SILVER' THEN 'Moto Pulsar'
  WHEN 'GOLD' THEN 'Resort internacional'
  WHEN 'SAPPHIRE' THEN 'Crucero'
  WHEN 'RUBY' THEN 'Automóvil o viaje a Europa'
  WHEN 'EMERALD' THEN 'Camioneta'
  WHEN 'PLATINUM' THEN 'Mini departamento'
  WHEN 'DIAMOND' THEN 'Lote con vivienda o departamento'
END,
"reward_description" = CASE "code"
  WHEN 'BRONZE' THEN 'Premio por alcanzar el rango Bronce.'
  WHEN 'SILVER' THEN 'Premio por alcanzar el rango Plata.'
  WHEN 'GOLD' THEN 'Premio por alcanzar el rango Oro.'
  WHEN 'SAPPHIRE' THEN 'Premio por alcanzar el rango Zafiro.'
  WHEN 'RUBY' THEN 'Premio referencial valorizado en USD 12.000.'
  WHEN 'EMERALD' THEN 'Premio referencial valorizado en USD 25.000.'
  WHEN 'PLATINUM' THEN 'Premio referencial valorizado en USD 60.000.'
  WHEN 'DIAMOND' THEN 'Premio referencial valorizado en USD 120.000.'
END;
