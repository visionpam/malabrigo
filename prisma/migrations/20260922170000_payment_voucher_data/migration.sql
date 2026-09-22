ALTER TABLE "payment_submissions" ADD COLUMN "voucher_data" BYTEA;
ALTER TABLE "payment_submissions" ADD COLUMN "voucher_mime_type" VARCHAR(40);
