-- Direct commission (generation 0) by program and payment mode.
INSERT INTO "commission_rules" ("program_id", "mode", "generation", "fixed_amount", "percentage", "points", "version", "active") VALUES
('20000000-0000-0000-0000-000000000001', 'CASH',   0, 200, NULL, 10, 1, true),
('20000000-0000-0000-0000-000000000001', 'CREDIT', 0, 100, NULL, 10, 1, true),
('20000000-0000-0000-0000-000000000002', 'CASH',   0, 400, NULL, 30, 1, true),
('20000000-0000-0000-0000-000000000002', 'CREDIT', 0, 200, NULL, 30, 1, true),
('20000000-0000-0000-0000-000000000003', 'CASH',   0, 666, NULL, 90, 1, true),
('20000000-0000-0000-0000-000000000003', 'CREDIT', 0, 333, NULL, 90, 1, true),
('20000000-0000-0000-0000-000000000004', 'CASH',   0, 1500, NULL, 180, 1, true),
('20000000-0000-0000-0000-000000000004', 'CREDIT', 0, 750, NULL, 180, 1, true);

-- Unilevel percentages. Null program/mode means the rule applies globally.
INSERT INTO "commission_rules" ("program_id", "mode", "generation", "fixed_amount", "percentage", "points", "version", "active") VALUES
(NULL, NULL, 1, NULL, 30.0000, 0, 1, true),
(NULL, NULL, 2, NULL, 10.0000, 0, 1, true),
(NULL, NULL, 3, NULL,  5.0000, 0, 1, true),
(NULL, NULL, 4, NULL,  4.0000, 0, 1, true),
(NULL, NULL, 5, NULL,  3.0000, 0, 1, true),
(NULL, NULL, 6, NULL,  2.0000, 0, 1, true),
(NULL, NULL, 7, NULL,  1.0000, 0, 1, true),
(NULL, NULL, 8, NULL,  0.5000, 0, 1, true);
