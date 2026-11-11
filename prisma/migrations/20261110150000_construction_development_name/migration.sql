ALTER TABLE "construction_projects"
ADD COLUMN "development_name" VARCHAR(160) NOT NULL DEFAULT 'Malabrigo Club Resort';

CREATE INDEX "construction_projects_development_name_active_idx"
ON "construction_projects" ("development_name", "active");
