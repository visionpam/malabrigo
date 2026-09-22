ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

ALTER TABLE "document_records"
  ADD COLUMN "void_reason" VARCHAR(500),
  ADD COLUMN "voided_at" TIMESTAMPTZ(6);
