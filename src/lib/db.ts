import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!connectionString && !isProductionBuild) {
  throw new Error("DATABASE_URL no está configurada");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Next.js carga los módulos de servidor mientras inspecciona las rutas del build.
// En esa fase no se realizan consultas, por lo que una URL inerte evita exigir
// secretos de ejecución antes de que exista una petición real.
const adapter = new PrismaPg({
  connectionString: connectionString ?? "postgresql://build:build@127.0.0.1:5432/build",
});

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
