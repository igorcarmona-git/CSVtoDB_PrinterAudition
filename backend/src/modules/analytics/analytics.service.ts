import { prisma } from "../../lib/prisma.js";
import {
  buildPrintJobWhere,
  type PrintJobFilters,
} from "../print-jobs/print-jobs.filters.js";

const RANKING_LIMIT = 10;

export async function summary(filters: PrintJobFilters) {
  const where = buildPrintJobWhere(filters);

  const [totalJobs, totals, users, printers, costCenters] =
    await prisma.$transaction([
      prisma.printJob.count({ where }),
      prisma.printJob.aggregate({
        where,
        _sum: { totalPages: true },
      }),
      prisma.printJob.findMany({
        where,
        distinct: ["username"],
        select: { username: true },
      }),
      prisma.printJob.findMany({
        where,
        distinct: ["printerName"],
        select: { printerName: true },
      }),
      prisma.printJob.findMany({
        where: { ...where, costCenterId: { not: null } },
        distinct: ["costCenterId"],
        select: { costCenterId: true },
      }),
    ]);

  return {
    totalJobs,
    totalPages: totals._sum.totalPages ?? 0,
    totalUsers: users.length,
    totalPrinters: printers.length,
    totalCostCenters: costCenters.length,
  };
}

export async function byCostCenter(filters: PrintJobFilters) {
  const where = buildPrintJobWhere(filters);
  const grouped = await prisma.printJob.groupBy({
    by: ["costCenterId"],
    where,
    _sum: { totalPages: true },
    _count: { _all: true },
    orderBy: { _sum: { totalPages: "desc" } },
    take: RANKING_LIMIT,
  });

  const ids = grouped
    .map((item) => item.costCenterId)
    .filter((id): id is string => Boolean(id));

  const costCenters = await prisma.costCenter.findMany({
    where: { id: { in: ids } },
  });
  const costCenterById = new Map(costCenters.map((item) => [item.id, item]));

  return grouped.map((item) => {
    const costCenter = item.costCenterId
      ? costCenterById.get(item.costCenterId)
      : null;

    return {
      costCenterId: item.costCenterId,
      code: costCenter?.code ?? null,
      name: costCenter?.name ?? "Sem centro de custo",
      totalJobs: item._count._all,
      totalPages: item._sum.totalPages ?? 0,
    };
  });
}

export async function byUser(filters: PrintJobFilters) {
  const grouped = await prisma.printJob.groupBy({
    by: ["username"],
    where: buildPrintJobWhere(filters),
    _sum: { totalPages: true },
    _count: { _all: true },
    orderBy: { _sum: { totalPages: "desc" } },
    take: RANKING_LIMIT,
  });

  return grouped.map((item) => ({
    name: item.username,
    totalJobs: item._count._all,
    totalPages: item._sum.totalPages ?? 0,
  }));
}

export async function byPrinter(filters: PrintJobFilters) {
  const grouped = await prisma.printJob.groupBy({
    by: ["printerName"],
    where: buildPrintJobWhere(filters),
    _sum: { totalPages: true },
    _count: { _all: true },
    orderBy: { _sum: { totalPages: "desc" } },
    take: RANKING_LIMIT,
  });

  return grouped.map((item) => ({
    name: item.printerName,
    totalJobs: item._count._all,
    totalPages: item._sum.totalPages ?? 0,
  }));
}
