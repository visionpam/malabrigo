CREATE TYPE "OwnershipType" AS ENUM ('SINGLE', 'MARRIED');
ALTER TABLE "programs" ADD COLUMN "married_holder_cap" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "sales" ADD COLUMN "ownership_type" "OwnershipType" NOT NULL DEFAULT 'SINGLE';
-- The existing test-only global participant records cannot be attributed to a sale.
DELETE FROM "beneficiaries";
ALTER TABLE "beneficiaries" ADD COLUMN "sale_id" UUID NOT NULL;
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "beneficiaries_sale_id_idx" ON "beneficiaries"("sale_id");
