# Malabrigo Club Resort

MVP web para la gestión de socios inversionistas, programas, cuotas, pagos y avance de obra.

## Desarrollo local

Requisitos: Node.js, pnpm y Docker.

```bash
docker compose up -d postgres
pnpm prisma migrate dev
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000` y PostgreSQL en el puerto `5432`.

## Comandos

- `pnpm dev`: inicia la aplicación.
- `pnpm build`: genera la compilación de producción.
- `pnpm lint`: ejecuta las reglas de calidad.
- `pnpm typecheck`: valida TypeScript.
