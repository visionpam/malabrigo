INSERT INTO "countries" ("code", "name", "sort_order") VALUES
('MH', 'Islas Marshall', 192),
('SB', 'Islas Salomón', 193),
('PS', 'Palestina', 194),
('TW', 'Taiwán', 195),
('XK', 'Kosovo', 196)
ON CONFLICT ("code") DO NOTHING;
