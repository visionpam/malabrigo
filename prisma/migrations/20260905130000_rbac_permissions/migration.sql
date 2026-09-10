CREATE TABLE "permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(300),
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

CREATE TABLE "user_permissions" (
  "user_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id", "permission_id"),
  CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "roles" ("id", "code", "name", "description") VALUES
('10000000-0000-0000-0000-000000000008', 'SUPERADMIN', 'Superadministrador', 'Acceso total y administración de seguridad')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

INSERT INTO "permissions" ("code", "name", "description") VALUES
('DASHBOARD', 'Resumen', 'Indicadores generales'),
('MEMBERS', 'Socios', 'Expedientes y perfiles'),
('AMBASSADORS', 'Embajadores', 'Red, rangos y comisiones'),
('SALES', 'Ventas', 'Operación comercial'),
('PAYMENTS', 'Pagos', 'Registro y conciliación'),
('CONTRACTS', 'Contratos', 'Documentos contractuales'),
('CONSTRUCTION', 'Avance de obra', 'Seguimiento del proyecto'),
('REPORTS', 'Reportes', 'Informes de gestión'),
('SETTINGS', 'Configuración', 'Catálogos del sistema'),
('ADMIN_USERS', 'Administrar usuarios', 'Usuarios administrativos y permisos')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
