import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { costCentersRoutes } from "./modules/cost-centers/cost-centers.routes.js";
import { importsRoutes } from "./modules/imports/imports.routes.js";
import { printJobsRoutes } from "./modules/print-jobs/print-jobs.routes.js";
import { printersRoutes } from "./modules/printers/printers.routes.js";
import { HttpError } from "./utils/http.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === "test" ? "silent" : "info",
    },
  });

  await app.register(cors, {
    origin: env.frontendOrigin,
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.sessionSecret,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 200,
      files: 1,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    const appError = error instanceof Error ? error : new Error(String(error));
    const statusCode =
      appError instanceof HttpError
        ? appError.statusCode
        : "statusCode" in appError && typeof appError.statusCode === "number"
          ? appError.statusCode
          : 500;

    if (statusCode >= 500) {
      request.log.error({ error: appError }, "Unhandled request error");
    }

    reply.status(statusCode).send({
      message:
        statusCode >= 500
          ? "Erro interno no servidor."
          : appError.message || "Erro na requisição.",
      details: appError instanceof HttpError ? appError.details : undefined,
    });
  });

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      service: "csvtodb-printer-audition-backend",
      timestamp: new Date().toISOString(),
    };
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(printJobsRoutes, { prefix: "/print-jobs" });
  await app.register(analyticsRoutes, { prefix: "/analytics" });
  await app.register(printersRoutes, { prefix: "/printers" });
  await app.register(costCentersRoutes, { prefix: "/cost-centers" });
  await app.register(importsRoutes, { prefix: "/imports" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}
