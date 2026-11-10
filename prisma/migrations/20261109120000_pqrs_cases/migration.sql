CREATE TYPE "PqrsCategory" AS ENUM ('PETITION', 'COMPLAINT', 'CLAIM', 'SUGGESTION');
CREATE TYPE "PqrsStatus" AS ENUM ('FILED', 'IN_REVIEW', 'ANSWERED', 'CLOSED');

CREATE TABLE "pqrs_cases" (
  "id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "owner_id" UUID NOT NULL,
  "category" "PqrsCategory" NOT NULL,
  "subject" VARCHAR(180) NOT NULL,
  "status" "PqrsStatus" NOT NULL DEFAULT 'FILED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_admin_reply_at" TIMESTAMPTZ(6),
  "member_seen_at" TIMESTAMPTZ(6),
  CONSTRAINT "pqrs_cases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pqrs_cases_code_key" ON "pqrs_cases"("code");
CREATE INDEX "pqrs_cases_owner_id_created_at_idx" ON "pqrs_cases"("owner_id", "created_at");
CREATE INDEX "pqrs_cases_status_updated_at_idx" ON "pqrs_cases"("status", "updated_at");
ALTER TABLE "pqrs_cases" ADD CONSTRAINT "pqrs_cases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pqrs_messages" (
  "id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "is_staff" BOOLEAN NOT NULL DEFAULT false,
  "file_name" VARCHAR(180),
  "file_mime_type" VARCHAR(50),
  "file_data" BYTEA,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pqrs_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pqrs_messages_case_id_created_at_idx" ON "pqrs_messages"("case_id", "created_at");
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "pqrs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pqrs_messages" ADD CONSTRAINT "pqrs_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
