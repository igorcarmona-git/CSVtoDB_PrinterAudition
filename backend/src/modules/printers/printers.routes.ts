import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/auth.service.js";
import {
  listPrinters,
  syncPrintersFromWmi,
  unsupportedWmiResponse,
} from "./printers.service.js";

export async function printersRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: requireAuth }, async () => {
    return { items: await listPrinters() };
  });

  app.post("/sync", { preHandler: requireAuth }, async () => {
    try {
      const result = await syncPrintersFromWmi();
      return result;
    } catch (error) {
      unsupportedWmiResponse(error);
    }
  });
}
