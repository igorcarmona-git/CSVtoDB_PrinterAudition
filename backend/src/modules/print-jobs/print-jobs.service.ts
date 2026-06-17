import { prisma } from "../../lib/prisma.js";
import { parsePagination, type PaginationQuery } from "../../utils/pagination.js";
import {
  buildPrintJobWhere,
  type PrintJobFilters,
} from "./print-jobs.filters.js";

export type PrintJobQuery = PaginationQuery & PrintJobFilters;

export async function listPrintJobs(query: PrintJobQuery) {
  const pagination = parsePagination(query);
  const where = buildPrintJobWhere(query);

  const [items, total] = await prisma.$transaction([
    prisma.printJob.findMany({
      where,
      include: {
        costCenter: true,
        printer: true,
        importBatch: {
          select: {
            id: true,
            source: true,
            fileName: true,
            startedAt: true,
          },
        },
      },
      orderBy: { timedoc: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.printJob.count({ where }),
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
