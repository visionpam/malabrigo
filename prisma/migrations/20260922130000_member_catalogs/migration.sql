CREATE TABLE "document_type_options" ("code" VARCHAR(20) NOT NULL, "name" VARCHAR(100) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "sort_order" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "document_type_options_pkey" PRIMARY KEY ("code"));
CREATE TABLE "occupation_options" ("code" VARCHAR(80) NOT NULL, "name" VARCHAR(140) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "sort_order" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "occupation_options_pkey" PRIMARY KEY ("code"));
CREATE TABLE "marital_status_options" ("code" VARCHAR(30) NOT NULL, "name" VARCHAR(100) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "sort_order" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "marital_status_options_pkey" PRIMARY KEY ("code"));

INSERT INTO "document_type_options" ("code","name","sort_order") VALUES ('DNI','DNI',1),('CE','Carné de extranjería',2),('PASSPORT','Pasaporte',3),('RUC','RUC',4) ON CONFLICT DO NOTHING;
INSERT INTO "occupation_options" ("code","name","sort_order") VALUES ('DEPENDIENTE','Empleado dependiente',1),('INDEPENDIENTE','Trabajador independiente',2),('EMPRESARIO','Empresario/a',3),('PROFESIONAL','Profesional',4),('COMERCIANTE','Comerciante',5),('JUBILADO','Jubilado/a',6),('ESTUDIANTE','Estudiante',7),('AMA_DE_CASA','Ama/o de casa',8),('OTRO','Otro',9) ON CONFLICT DO NOTHING;
INSERT INTO "marital_status_options" ("code","name","sort_order") VALUES ('SINGLE','Soltero/a',1),('MARRIED','Casado/a',2),('COHABITING','Conviviente',3),('DIVORCED','Divorciado/a',4),('WIDOWED','Viudo/a',5),('OTHER','Otro',6) ON CONFLICT DO NOTHING;

ALTER TABLE "members" ALTER COLUMN "marital_status" TYPE VARCHAR(30) USING "marital_status"::text;
ALTER TABLE "members" ADD CONSTRAINT "members_document_type_fkey" FOREIGN KEY ("document_type") REFERENCES "document_type_options"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_marital_status_fkey" FOREIGN KEY ("marital_status") REFERENCES "marital_status_options"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
DROP TYPE IF EXISTS "MaritalStatus";
