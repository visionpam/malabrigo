CREATE TYPE "DossierSubjectKind" AS ENUM ('SALE', 'PRIMARY_HOLDER', 'HOLDER', 'BENEFICIARY');
CREATE TYPE "DossierStatus" AS ENUM ('REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "dossier_documents" (
  "id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "beneficiary_id" UUID,
  "subject_kind" "DossierSubjectKind" NOT NULL,
  "subject_name" VARCHAR(180) NOT NULL,
  "category" "DocumentCategory" NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "status" "DossierStatus" NOT NULL DEFAULT 'REQUESTED',
  "file_data" BYTEA,
  "file_mime_type" VARCHAR(40),
  "file_name" VARCHAR(180),
  "uploaded_by_id" UUID,
  "rejection_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "reviewed_at" TIMESTAMPTZ(6),
  CONSTRAINT "dossier_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dossier_documents_sale_id_status_idx" ON "dossier_documents"("sale_id", "status");
CREATE INDEX "dossier_documents_beneficiary_id_idx" ON "dossier_documents"("beneficiary_id");
ALTER TABLE "dossier_documents" ADD CONSTRAINT "dossier_documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dossier_documents" ADD CONSTRAINT "dossier_documents_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
