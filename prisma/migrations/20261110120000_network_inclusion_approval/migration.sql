ALTER TABLE "investor_profiles"
ADD COLUMN "network_approval_status" VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "network_approved_at" TIMESTAMPTZ(6);

UPDATE "investor_profiles"
SET "network_approval_status" = 'PENDING'
WHERE "sponsor_id" IS NOT NULL;

CREATE INDEX "investor_profiles_network_approval_status_idx"
ON "investor_profiles" ("network_approval_status");
