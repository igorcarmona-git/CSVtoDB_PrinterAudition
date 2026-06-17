import { prisma } from "../../lib/prisma.js";
import { badRequest } from "../../utils/http.js";

export type UpsertCostCenterInput = {
  code?: string;
  name?: string;
  management?: string | null;
  active?: boolean;
};

export async function listCostCenters() {
  return prisma.costCenter.findMany({
    include: {
      _count: {
        select: {
          printers: true,
          printJobs: true,
        },
      },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function upsertCostCenter(input: UpsertCostCenterInput) {
  const code = input.code?.trim();
  const name = input.name?.trim();

  if (!code || !name) {
    throw badRequest("Informe code e name.");
  }

  return prisma.costCenter.upsert({
    where: { code },
    update: {
      name,
      management: input.management?.trim() || null,
      active: input.active ?? true,
    },
    create: {
      code,
      name,
      management: input.management?.trim() || null,
      active: input.active ?? true,
    },
  });
}
