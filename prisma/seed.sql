-- Administrative and portal roles
INSERT INTO "roles" ("id", "code", "name", "description") VALUES
  ('10000000-0000-0000-0000-000000000001', 'DIRECTION', 'Dirección', 'Acceso total, configuración y reportes ejecutivos'),
  ('10000000-0000-0000-0000-000000000002', 'FINANCE', 'Finanzas', 'Pagos, conciliación, cartera y estados de cuenta'),
  ('10000000-0000-0000-0000-000000000003', 'COMMERCIAL', 'Comercial / Red', 'Socios, embajadores, referidos y calificaciones'),
  ('10000000-0000-0000-0000-000000000004', 'SUPPORT', 'Soporte', 'Expedientes, datos y atención al socio'),
  ('10000000-0000-0000-0000-000000000005', 'CONSTRUCTION', 'Obra', 'Avance físico y galería del proyecto'),
  ('10000000-0000-0000-0000-000000000006', 'MEMBER', 'Socio inversionista', 'Portal del socio inversionista'),
  ('10000000-0000-0000-0000-000000000007', 'AMBASSADOR', 'Socio embajador', 'Portal de referidos y futura compensación')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";

-- Confirmed commercial program catalog
INSERT INTO "programs" (
  "id", "kind", "name", "cash_price", "separation", "cash_shares",
  "cash_stay_days", "beneficiary_cap", "married_beneficiary_cap", "active"
) VALUES
  ('20000000-0000-0000-0000-000000000001', 'PLUS', 'Plus', 2000.00, 200.00, NULL, 1000, 1, 0, true),
  ('20000000-0000-0000-0000-000000000002', 'PREMIUM', 'Vitalicio Premium', 2600.00, 200.00, 2600, NULL, 2, 1, true),
  ('20000000-0000-0000-0000-000000000003', 'FAMILIAR', 'Vitalicio Familiar', 3900.00, 200.00, 3900, NULL, 4, 3, true),
  ('20000000-0000-0000-0000-000000000004', 'VIP', 'Vitalicio VIP', 7800.00, 200.00, 7800, NULL, 10, 9, true)
ON CONFLICT ("kind") DO UPDATE SET
  "name" = EXCLUDED."name",
  "cash_price" = EXCLUDED."cash_price",
  "separation" = EXCLUDED."separation",
  "cash_shares" = EXCLUDED."cash_shares",
  "cash_stay_days" = EXCLUDED."cash_stay_days",
  "active" = EXCLUDED."active";

-- Credit terms from the approved program tables
INSERT INTO "financing_plans" (
  "id", "program_id", "term_months", "down_payment", "financed_amount",
  "monthly_payment", "shares_granted", "stay_days_granted", "active"
) VALUES
  ('30000000-0000-0000-0000-000000000001', (SELECT "id" FROM "programs" WHERE "kind" = 'PLUS'), 3, 300.00, 1500.00, 500.00, NULL, 900, true),
  ('30000000-0000-0000-0000-000000000002', (SELECT "id" FROM "programs" WHERE "kind" = 'PLUS'), 6, 300.00, 1500.00, 250.00, NULL, 730, true),
  ('30000000-0000-0000-0000-000000000003', (SELECT "id" FROM "programs" WHERE "kind" = 'PLUS'), 12, 300.00, 1500.00, 125.00, NULL, 450, true),
  ('30000000-0000-0000-0000-000000000004', (SELECT "id" FROM "programs" WHERE "kind" = 'PLUS'), 15, 300.00, 1500.00, 100.00, NULL, 365, true),

  ('30000000-0000-0000-0000-000000000005', (SELECT "id" FROM "programs" WHERE "kind" = 'PREMIUM'), 3, 600.00, 1800.00, 600.00, 2400, NULL, true),
  ('30000000-0000-0000-0000-000000000006', (SELECT "id" FROM "programs" WHERE "kind" = 'PREMIUM'), 6, 600.00, 1800.00, 300.00, 2000, NULL, true),
  ('30000000-0000-0000-0000-000000000007', (SELECT "id" FROM "programs" WHERE "kind" = 'PREMIUM'), 12, 600.00, 1800.00, 150.00, 1600, NULL, true),
  ('30000000-0000-0000-0000-000000000008', (SELECT "id" FROM "programs" WHERE "kind" = 'PREMIUM'), 18, 600.00, 1800.00, 100.00, 1200, NULL, true),

  ('30000000-0000-0000-0000-000000000009', (SELECT "id" FROM "programs" WHERE "kind" = 'FAMILIAR'), 3, 1000.00, 2700.00, 900.00, 3750, NULL, true),
  ('30000000-0000-0000-0000-000000000010', (SELECT "id" FROM "programs" WHERE "kind" = 'FAMILIAR'), 6, 1000.00, 2700.00, 450.00, 3250, NULL, true),
  ('30000000-0000-0000-0000-000000000011', (SELECT "id" FROM "programs" WHERE "kind" = 'FAMILIAR'), 12, 1000.00, 2700.00, 225.00, 3000, NULL, true),
  ('30000000-0000-0000-0000-000000000012', (SELECT "id" FROM "programs" WHERE "kind" = 'FAMILIAR'), 18, 1000.00, 2700.00, 150.00, 2600, NULL, true),
  ('30000000-0000-0000-0000-000000000013', (SELECT "id" FROM "programs" WHERE "kind" = 'FAMILIAR'), 24, 1000.00, 2700.00, 112.50, 2400, NULL, true),

  ('30000000-0000-0000-0000-000000000014', (SELECT "id" FROM "programs" WHERE "kind" = 'VIP'), 3, 2500.00, 5100.00, 1700.00, 7500, NULL, true),
  ('30000000-0000-0000-0000-000000000015', (SELECT "id" FROM "programs" WHERE "kind" = 'VIP'), 6, 2500.00, 5100.00, 850.00, 6500, NULL, true),
  ('30000000-0000-0000-0000-000000000016', (SELECT "id" FROM "programs" WHERE "kind" = 'VIP'), 12, 2500.00, 5100.00, 425.00, 6250, NULL, true),
  ('30000000-0000-0000-0000-000000000017', (SELECT "id" FROM "programs" WHERE "kind" = 'VIP'), 18, 2500.00, 5100.00, 283.00, 6000, NULL, true),
  ('30000000-0000-0000-0000-000000000018', (SELECT "id" FROM "programs" WHERE "kind" = 'VIP'), 24, 2500.00, 5100.00, 212.50, 5200, NULL, true),
  ('30000000-0000-0000-0000-000000000019', (SELECT "id" FROM "programs" WHERE "kind" = 'VIP'), 36, 2500.00, 5100.00, 142.00, 5000, NULL, true)
ON CONFLICT ("program_id", "term_months") DO UPDATE SET
  "down_payment" = EXCLUDED."down_payment",
  "financed_amount" = EXCLUDED."financed_amount",
  "monthly_payment" = EXCLUDED."monthly_payment",
  "shares_granted" = EXCLUDED."shares_granted",
  "stay_days_granted" = EXCLUDED."stay_days_granted",
  "active" = EXCLUDED."active";
