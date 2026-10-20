-- Preserve existing participants: their document type was never recorded.
ALTER TABLE "beneficiaries" ADD COLUMN "document_type" VARCHAR(20);
