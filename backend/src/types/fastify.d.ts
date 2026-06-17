import type { UserRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
    };
  }
}
