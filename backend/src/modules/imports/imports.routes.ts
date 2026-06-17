import { ImportSource } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { badRequest } from "../../utils/http.js";
import { requireAuth } from "../auth/auth.service.js";
import { importCsv, importLatestFolderCsv, listImportBatches } from "./imports.service.js";

type ImportListQuery = {
  page?: string;
  pageSize?: string;
};

export async function importsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ImportListQuery }>(
    "/",
    { preHandler: requireAuth },
    async (request) => {
      return listImportBatches(request.query);
    },
  );

  app.post("/upload", { preHandler: requireAuth }, async (request) => {
    const file = await request.file();
    if (!file) {
      throw badRequest("Envie um arquivo CSV no campo file.");
    }

    const buffer = await file.toBuffer();
    return importCsv({
      source: ImportSource.UPLOAD,
      buffer,
      fileName: file.filename,
    });
  });

  app.post("/folder/latest", { preHandler: requireAuth }, async () => {
    return importLatestFolderCsv();
  });
}
