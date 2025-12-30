import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prismaInstance: PrismaClient;

try {
  if (process.env.DATABASE_URL) {
    prismaInstance =
      globalForPrisma.prisma ||
      new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
        log: ["query", "error", "warn"],
      });

    if (process.env.NODE_ENV !== "production")
      globalForPrisma.prisma = prismaInstance;
  } else {
    // No DATABASE_URL configured — export a harmless stub so app can start without DB
    // Real DB operations will fail if attempted; this avoids throwing during import.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaInstance = (globalForPrisma.prisma as any) || ({} as PrismaClient);
  }
} catch (err) {
  // If Prisma initialization fails (e.g., missing adapter), log and provide a stub.
  // eslint-disable-next-line no-console
  console.error("Prisma initialization failed:", err);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaInstance = (globalForPrisma.prisma as any) || ({} as PrismaClient);
}

export const prisma: PrismaClient = prismaInstance;
