import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Usamos un Singleton para que Next.js no cree 100 conexiones al recargar
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query'], // Útil para ver errores en la consola
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;