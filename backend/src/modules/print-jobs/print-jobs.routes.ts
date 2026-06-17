import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/auth.service.js";
import { listPrintJobs, type PrintJobQuery } from "./print-jobs.service.js";

export async function printJobsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: PrintJobQuery }>(
    "/",
    { preHandler: requireAuth },
    async (request) => {
      return listPrintJobs(request.query);
    },
  );
}
