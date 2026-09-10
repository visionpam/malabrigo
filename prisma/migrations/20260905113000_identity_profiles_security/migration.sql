ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'LOCKED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DISABLED';
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'COHABITING', 'DIVORCED', 'WIDOWED', 'OTHER');
CREATE TYPE "AmbassadorStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'WITHDRAWN');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REVERSED');

ALTER TABLE "members"
  ADD COLUMN "member_code" CHAR(7),
  ADD COLUMN "residence" VARCHAR(180),
  ADD COLUMN "occupation" VARCHAR(140),
  ADD COLUMN "marital_status" "MaritalStatus";

DO $$
DECLARE candidate text; target uuid;
BEGIN
  FOR target IN SELECT id FROM members WHERE member_code IS NULL LOOP
    LOOP
      candidate := (1000000 + floor(random() * 9000000)::int)::text;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM members WHERE member_code = candidate);
    END LOOP;
    UPDATE members SET member_code = candidate WHERE id = target;
  END LOOP;
END $$;

ALTER TABLE "members" ALTER COLUMN "member_code" SET NOT NULL;
CREATE UNIQUE INDEX "members_member_code_key" ON "members"("member_code");
CREATE UNIQUE INDEX "members_email_lower_key" ON "members"(lower("email"));

CREATE TABLE "investor_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "member_id" UUID NOT NULL,
  "status" "MemberStatus" NOT NULL DEFAULT 'PROSPECT', "activated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investor_profiles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "investor_profiles_member_id_key" ON "investor_profiles"("member_id");
INSERT INTO "investor_profiles" ("member_id", "status", "activated_at")
SELECT "id", "status", "joined_at" FROM "members";

CREATE TABLE "ambassador_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "member_id" UUID NOT NULL,
  "referral_code" CHAR(7) NOT NULL, "sponsor_id" UUID,
  "status" "AmbassadorStatus" NOT NULL DEFAULT 'PENDING', "current_rank" VARCHAR(30),
  "affiliated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ambassador_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ambassador_profiles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ambassador_profiles_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "ambassador_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ambassador_profiles_member_id_key" ON "ambassador_profiles"("member_id");
CREATE UNIQUE INDEX "ambassador_profiles_referral_code_key" ON "ambassador_profiles"("referral_code");
CREATE INDEX "ambassador_profiles_sponsor_id_idx" ON "ambassador_profiles"("sponsor_id");

INSERT INTO "ambassador_profiles" ("member_id", "referral_code", "status", "affiliated_at")
SELECT r."member_id",
       CASE WHEN r."code" ~ '^[0-9]{7}$' THEN r."code" ELSE (1000000 + floor(random() * 9000000)::int)::text END,
       CASE WHEN r."active" THEN 'ACTIVE'::"AmbassadorStatus" ELSE 'SUSPENDED'::"AmbassadorStatus" END,
       r."created_at"
FROM "referral_codes" r
ON CONFLICT DO NOTHING;

CREATE TABLE "beneficiaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "member_id" UUID NOT NULL,
  "full_name" VARCHAR(180) NOT NULL, "document" VARCHAR(60), "relationship" VARCHAR(60) NOT NULL,
  "is_spouse" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "beneficiaries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "beneficiaries_member_id_idx" ON "beneficiaries"("member_id");

CREATE TABLE "account_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL, "consumed_at" TIMESTAMPTZ(6), "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "account_invitations_token_hash_key" ON "account_invitations"("token_hash");
CREATE INDEX "account_invitations_user_id_expires_at_idx" ON "account_invitations"("user_id", "expires_at");

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL, "consumed_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

CREATE TABLE "user_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL, "revoked_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

CREATE TABLE "commission_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "program_id" UUID, "mode" "SaleMode", "generation" INTEGER NOT NULL DEFAULT 0,
  "fixed_amount" DECIMAL(18,2), "percentage" DECIMAL(7,4), "points" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_rules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "commission_rules_program_id_mode_generation_version_key" ON "commission_rules"("program_id", "mode", "generation", "version");

CREATE TABLE "commission_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ambassador_id" UUID NOT NULL, "source_sale_id" UUID NOT NULL,
  "source_payment_id" UUID, "generation" INTEGER NOT NULL, "amount" DECIMAL(18,2) NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0, "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_entries_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassador_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "commission_entries_ambassador_id_status_idx" ON "commission_entries"("ambassador_id", "status");
CREATE INDEX "commission_entries_source_sale_id_idx" ON "commission_entries"("source_sale_id");

CREATE TABLE "rank_definitions" (
  "code" VARCHAR(30) NOT NULL, "name" VARCHAR(60) NOT NULL, "sort_order" INTEGER NOT NULL,
  "member_count" INTEGER NOT NULL, "direct_count" INTEGER NOT NULL, "direct_points" INTEGER NOT NULL,
  "total_points" INTEGER NOT NULL, "deadline_months" INTEGER NOT NULL, "monthly_bonus" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "rank_definitions_pkey" PRIMARY KEY ("code")
);
CREATE UNIQUE INDEX "rank_definitions_sort_order_key" ON "rank_definitions"("sort_order");

CREATE TABLE "ambassador_rank_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ambassador_id" UUID NOT NULL, "rank_code" VARCHAR(30) NOT NULL,
  "achieved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "snapshot" JSONB NOT NULL,
  CONSTRAINT "ambassador_rank_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ambassador_rank_history_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassador_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ambassador_rank_history_rank_code_fkey" FOREIGN KEY ("rank_code") REFERENCES "rank_definitions"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ambassador_rank_history_ambassador_id_rank_code_key" ON "ambassador_rank_history"("ambassador_id", "rank_code");

INSERT INTO "rank_definitions" VALUES
('BRONZE','Bronce',1,5,1,90,450,6,50), ('SILVER','Plata',2,10,2,180,900,12,100),
('GOLD','Oro',3,25,3,270,2250,18,250), ('SAPPHIRE','Zafiro',4,50,4,360,4500,24,450),
('RUBY','Rubí',5,125,5,450,11250,30,1000), ('EMERALD','Esmeralda',6,250,6,540,22500,36,1750),
('PLATINUM','Platino',7,625,10,900,56250,42,3750), ('DIAMOND','Diamante',8,1250,20,1800,112500,48,6500);

INSERT INTO "programs" ("id","kind","name","cash_price","separation","cash_shares","cash_stay_days","beneficiary_cap","active")
VALUES ('20000000-0000-0000-0000-000000000005','FOUNDATION','GM Club Foundation',19500,200,19500,NULL,11,true)
ON CONFLICT ("kind") DO NOTHING;
