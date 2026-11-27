import { PrismaClient } from '@prisma/client';

// Auto-normalizar variables de entorno que puedan tener espacios al inicio/final en Railway
for (const [key, val] of Object.entries(process.env)) {
  const trimmedKey = key.trim();
  if (trimmedKey !== key && val) {
    process.env[trimmedKey] = val.trim();
  }
}

const resolvedDatabaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_PUBLIC_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  Object.values(process.env).find((v) =>
    typeof v === 'string' && v.trim().startsWith('postgresql://')
  )?.trim();

if (resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

const CURRENT_SCHEMA_VERSION = 'v2-roles-epb';

if (globalForPrisma.prismaSchemaVersion !== CURRENT_SCHEMA_VERSION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaSchemaVersion = CURRENT_SCHEMA_VERSION;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
