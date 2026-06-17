import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/auth.service.js";
import {
  listCostCenters,
  upsertCostCenter,
  type UpsertCostCenterInput,
} from "./cost-centers.service.js";

export async function costCentersRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: requireAuth }, async () => {
    return { items: await listCostCenters() };
  });

  app.post<{ Body: UpsertCostCenterInput }>(
    "/",
    { preHandler: requireAuth },
    async (request) => {
      return upsertCostCenter(request.body);
    },
  );
}
