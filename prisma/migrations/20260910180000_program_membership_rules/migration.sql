ALTER TABLE "programs"
  ADD COLUMN "married_beneficiary_cap" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "membership_name" VARCHAR(160),
  ADD COLUMN "shareholder_category" VARCHAR(80),
  ADD COLUMN "observations" VARCHAR(500);

UPDATE "programs" SET
  "beneficiary_cap" = CASE "kind"::text WHEN 'FOUNDATION' THEN 11 WHEN 'PLUS' THEN 1 WHEN 'PREMIUM' THEN 2 WHEN 'FAMILIAR' THEN 4 WHEN 'VIP' THEN 10 ELSE "beneficiary_cap" END,
  "married_beneficiary_cap" = CASE "kind"::text WHEN 'FOUNDATION' THEN 10 WHEN 'PLUS' THEN 0 WHEN 'PREMIUM' THEN 1 WHEN 'FAMILIAR' THEN 3 WHEN 'VIP' THEN 9 ELSE 0 END,
  "membership_name" = CASE "kind"::text WHEN 'PLUS' THEN '1000 días/noches' ELSE 'Membresía Vitalicia' END,
  "shareholder_category" = CASE "kind"::text WHEN 'PREMIUM' THEN 'Categoría B' WHEN 'FAMILIAR' THEN 'Categoría A' WHEN 'VIP' THEN 'Categoría A' ELSE NULL END,
  "observations" = CASE "kind"::text WHEN 'FOUNDATION' THEN 'Accionista + GLAMPING Unidad Inmobiliaria' WHEN 'PLUS' THEN 'No cuenta con acciones' ELSE NULL END;
