import fs from "node:fs/promises";
import path from "node:path";
import { ImportSource, Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../utils/http.js";
import { parsePagination, type PaginationQuery } from "../../utils/pagination.js";
import { printerCacheByName, trySyncPrintersForImport } from "../printers/printers.service.js";
import { parsePapercutCsv, type ParsedPrintJob } from "./papercut-parser.js";

const INSERT_CHUNK_SIZE = 500;
const LOOKUP_CHUNK_SIZE = 1000;

type ImportInput = {
  source: ImportSource;
  buffer: Buffer;
  fileName?: string;
  filePath?: string;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function existingDedupeKeys(keys: string[]) {
  const found = new Set<string>();

  for (const chunk of chunkArray(keys, LOOKUP_CHUNK_SIZE)) {
    const rows = await prisma.printJob.findMany({
      where: { dedupeKey: { in: chunk } },
      select: { dedupeKey: true },
    });

    rows.forEach((row) => found.add(row.dedupeKey));
  }

  return found;
}

async function createPrintJobs(
  batchId: string,
  jobs: ParsedPrintJob[],
) {
  const printerCache = await printerCacheByName();
  const existingKeys = await existingDedupeKeys(jobs.map((job) => job.dedupeKey));
  const seenInFile = new Set<string>();
  const rowsToInsert: Prisma.PrintJobCreateManyInput[] = [];
  let duplicateRows = 0;

  for (const job of jobs) {
    if (existingKeys.has(job.dedupeKey) || seenInFile.has(job.dedupeKey)) {
      duplicateRows += 1;
      continue;
    }

    seenInFile.add(job.dedupeKey);
    const printer = printerCache.get(job.printerName);

    rowsToInsert.push({
      dedupeKey: job.dedupeKey,
      timedoc: job.timedoc,
      username: job.username,
      pages: job.pages,
      copies: job.copies,
      totalPages: job.totalPages,
      printerName: job.printerName,
      printerDriver: printer?.driver ?? null,
      printerIP: printer?.ip ?? null,
      documentName: job.documentName,
      clientPC: job.clientPC,
      paperSize: job.paperSize,
      languageMethod: job.languageMethod,
      height: job.height,
      width: job.width,
      duplex: job.duplex,
      grayscale: job.grayscale,
      fileSize: job.fileSize,
      printerId: printer?.id ?? null,
      costCenterId: printer?.costCenterId ?? null,
      importBatchId: batchId,
    });
  }

  let insertedRows = 0;

  for (const chunk of chunkArray(rowsToInsert, INSERT_CHUNK_SIZE)) {
    const result = await prisma.printJob.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedRows += result.count;
  }

  duplicateRows += rowsToInsert.length - insertedRows;
  return { insertedRows, duplicateRows };
}

export async function importCsv(input: ImportInput) {
  const parsed = parsePapercutCsv(input.buffer);

  const batch = await prisma.importBatch.create({
    data: {
      source: input.source,
      fileName: input.fileName,
      filePath: input.filePath,
      status: "PROCESSING",
      totalRows: parsed.totalRows,
      failedRows: parsed.failedRows,
    },
  });

  const warnings: string[] = [];

  try {
    const syncWarning = await trySyncPrintersForImport();
    if (syncWarning) warnings.push(syncWarning);

    const { insertedRows, duplicateRows } = await createPrintJobs(
      batch.id,
      parsed.jobs,
    );

    const updatedBatch = await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        insertedRows,
        duplicateRows,
        failedRows: parsed.failedRows,
        finishedAt: new Date(),
      },
    });

    return {
      batch: updatedBatch,
      warnings,
      rowErrors: parsed.rowErrors.slice(0, 25),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        finishedAt: new Date(),
      },
    });

    throw error;
  }
}

async function latestCsvFromFolder(folder: string) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => entry.name.toLowerCase().endsWith(".csv"))
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const filePath = path.join(folder, entry.name);
        const stats = await fs.stat(filePath);
        return { filePath, fileName: entry.name, mtimeMs: stats.mtimeMs };
      }),
  );

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0] ?? null;
}

export async function importLatestFolderCsv() {
  if (!env.papercutImportFolder) {
    throw badRequest("Configure PAPERCUT_IMPORT_FOLDER para usar esta rota.");
  }

  const latest = await latestCsvFromFolder(env.papercutImportFolder);
  if (!latest) {
    throw notFound("Nenhum CSV encontrado na pasta configurada.");
  }

  const buffer = await fs.readFile(latest.filePath);

  return importCsv({
    source: ImportSource.FOLDER,
    buffer,
    fileName: latest.fileName,
    filePath: latest.filePath,
  });
}

export async function listImportBatches(query: PaginationQuery) {
  const pagination = parsePagination(query);
  const [items, total] = await prisma.$transaction([
    prisma.importBatch.findMany({
      orderBy: { startedAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.importBatch.count(),
  ]);

  return {
    items,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}
