CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'SIGNED', 'VOIDED');

CREATE TABLE "contract_templates" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_templates_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "document_url" TEXT,
    "generated_at" TIMESTAMPTZ(6),
    "signed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "contract_id" UUID,
    "type" VARCHAR(80) NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "evidence" JSONB,
    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contract_templates_code_version_key" ON "contract_templates"("code", "version");
CREATE INDEX "contracts_status_created_at_idx" ON "contracts"("status", "created_at");
CREATE INDEX "contracts_sale_id_idx" ON "contracts"("sale_id");
CREATE INDEX "legal_acceptances_member_id_accepted_at_idx" ON "legal_acceptances"("member_id", "accepted_at");

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
