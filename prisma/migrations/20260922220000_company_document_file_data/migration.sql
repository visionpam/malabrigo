ALTER TABLE "document_records" ADD COLUMN "file_data" BYTEA;
ALTER TABLE "document_records" ADD COLUMN "file_mime_type" VARCHAR(40);
