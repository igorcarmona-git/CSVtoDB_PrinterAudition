import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { conflict } from "../../utils/http.js";
import {
  readPrintersFromWmi,
  WmiUnsupportedError,
  type WmiPrinter,
} from "./wmi.service.js";

function normalizeLocationCode(location: string | null) {
  const code = location?.trim();
  return code ? code : null;
}

async function resolveCostCenterId(printer: WmiPrinter) {
  const code = normalizeLocationCode(printer.location);
  if (!code) return null;

  const costCenter = await prisma.costCenter.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name: code,
    },
  });

  return costCenter.id;
}

export async function syncPrintersFromWmi() {
  const printers = await readPrintersFromWmi();
  const syncedAt = new Date();
  let createdOrUpdated = 0;

  for (const printer of printers) {
    const costCenterId = await resolveCostCenterId(printer);

    await prisma.printer.upsert({
      where: { name: printer.name },
      update: {
        location: printer.location,
        ip: printer.ip,
        driver: printer.driver,
        costCenterId,
        lastSyncedAt: syncedAt,
      },
      create: {
        name: printer.name,
        location: printer.location,
        ip: printer.ip,
        driver: printer.driver,
        costCenterId,
        lastSyncedAt: syncedAt,
      },
    });

    createdOrUpdated += 1;
  }

  return { syncedAt, total: createdOrUpdated };
}

export async function trySyncPrintersForImport() {
  try {
    await syncPrintersFromWmi();
    return null;
  } catch (error) {
    if (error instanceof WmiUnsupportedError) {
      return error.message;
    }

    throw error;
  }
}

export async function listPrinters() {
  return prisma.printer.findMany({
    include: { costCenter: true },
    orderBy: { name: "asc" },
  });
}

export async function printerCacheByName() {
  const printers = await prisma.printer.findMany({
    include: { costCenter: true },
  });

  return new Map(printers.map((printer) => [printer.name, printer]));
}

export function unsupportedWmiResponse(error: unknown) {
  if (error instanceof WmiUnsupportedError) {
    throw conflict(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    throw conflict("Não foi possível sincronizar impressoras.", error.message);
  }

  throw error;
}
