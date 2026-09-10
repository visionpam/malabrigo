ALTER TABLE "investor_profiles" ADD COLUMN "sponsor_id" UUID;
CREATE INDEX "investor_profiles_sponsor_id_idx" ON "investor_profiles"("sponsor_id");
ALTER TABLE "investor_profiles" ADD CONSTRAINT "investor_profiles_sponsor_id_fkey"
FOREIGN KEY ("sponsor_id") REFERENCES "ambassador_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
