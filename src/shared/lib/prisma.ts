import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

// pg now treats sslmode=require/prefer/verify-ca as verify-full and warns about it on every cold
// start. Make it explicit so behavior is unchanged but the warning (and future drift) is gone.
// Local connections without sslmode are left alone.
function withExplicitSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get('sslmode');

    if (sslmode && ['require', 'prefer', 'verify-ca'].includes(sslmode)) {
      url.searchParams.set('sslmode', 'verify-full');
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: withExplicitSslMode(process.env.DATABASE_URL ?? ''),
    }),
    log: ['warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
