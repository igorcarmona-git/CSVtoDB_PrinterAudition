export type PaginationQuery = {
  page?: string;
  pageSize?: string;
};

export function parsePagination(query: PaginationQuery) {
  const page = Math.max(Number(query.page ?? 1) || 1, 1);
  const pageSizeRaw = Number(query.pageSize ?? 25) || 25;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
