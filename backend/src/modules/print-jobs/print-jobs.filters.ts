import type { Prisma } from "@prisma/client";
import { badRequest } from "../../utils/http.js";

export type PrintJobFilters = {
  dateFrom?: string;
  dateTo?: string;
  username?: string;
  printerName?: string;
  costCenterId?: string;
  clientPC?: string;
};

function parseDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${label} inválida.`);
  }

  return date;
}

export function buildPrintJobWhere(filters: PrintJobFilters) {
  const where: Prisma.PrintJobWhereInput = {};

  if (filters.dateFrom || filters.dateTo) {
    where.timedoc = {};
    if (filters.dateFrom) where.timedoc.gte = parseDate(filters.dateFrom, "dateFrom");
    if (filters.dateTo) where.timedoc.lte = parseDate(filters.dateTo, "dateTo");
  }

  if (filters.username) {
    where.username = { contains: filters.username, mode: "insensitive" };
  }

  if (filters.printerName) {
    where.printerName = { contains: filters.printerName, mode: "insensitive" };
  }

  if (filters.costCenterId) {
    where.costCenterId = filters.costCenterId;
  }

  if (filters.clientPC) {
    where.clientPC = { contains: filters.clientPC, mode: "insensitive" };
  }

  return where;
}
