import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/auth.service.js";
import type { PrintJobFilters } from "../print-jobs/print-jobs.filters.js";
import { byCostCenter, byPrinter, byUser, summary } from "./analytics.service.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: PrintJobFilters }>(
    "/summary",
    { preHandler: requireAuth },
    async (request) => {
      return summary(request.query);
    },
  );

  app.get<{ Querystring: PrintJobFilters }>(
    "/by-cost-center",
    { preHandler: requireAuth },
    async (request) => {
      return { items: await byCostCenter(request.query) };
    },
  );

  app.get<{ Querystring: PrintJobFilters }>(
    "/by-user",
    { preHandler: requireAuth },
    async (request) => {
      return { items: await byUser(request.query) };
    },
  );

  app.get<{ Querystring: PrintJobFilters }>(
    "/by-printer",
    { preHandler: requireAuth },
    async (request) => {
      return { items: await byPrinter(request.query) };
    },
  );
}
