CREATE TABLE "construction_projects" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "construction_projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "construction_projects_code_key" ON "construction_projects"("code");

ALTER TABLE "project_stages" ADD COLUMN "project_id" UUID;

INSERT INTO "construction_projects" ("id", "code", "name", "description")
SELECT '00000000-0000-4000-8000-000000000001', 'PROYECTO-ANTERIOR', 'Proyecto anterior',
       'Proyecto creado automáticamente para conservar las etapas existentes.'
WHERE EXISTS (SELECT 1 FROM "project_stages");

UPDATE "project_stages" SET "project_id" = '00000000-0000-4000-8000-000000000001'
WHERE "project_id" IS NULL;

ALTER TABLE "project_stages" ALTER COLUMN "project_id" SET NOT NULL;
CREATE INDEX "project_stages_project_id_sort_order_idx" ON "project_stages"("project_id", "sort_order");
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "construction_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
