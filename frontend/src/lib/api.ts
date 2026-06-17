const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN";
};

export type CostCenter = {
  id: string;
  code: string;
  name: string;
  management: string | null;
  active: boolean;
  _count?: {
    printers: number;
    printJobs: number;
  };
};

export type Printer = {
  id: string;
  name: string;
  location: string | null;
  ip: string | null;
  driver: string | null;
  lastSyncedAt: string | null;
  costCenter: CostCenter | null;
};

export type ImportBatch = {
  id: string;
  source: "UPLOAD" | "FOLDER";
  fileName: string | null;
  filePath: string | null;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  insertedRows: number;
  duplicateRows: number;
  failedRows: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type PrintJob = {
  id: string;
  timedoc: string;
  username: string;
  pages: number;
  copies: number;
  totalPages: number;
  printerName: string;
  printerDriver: string | null;
  printerIP: string | null;
  documentName: string | null;
  clientPC: string | null;
  paperSize: string | null;
  duplex: string | null;
  grayscale: string | null;
  costCenter: CostCenter | null;
  printer: Printer | null;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PrintJobFilters = {
  dateFrom?: string;
  dateTo?: string;
  username?: string;
  printerName?: string;
  costCenterId?: string;
  clientPC?: string;
  page?: number;
  pageSize?: number;
};

export type Summary = {
  totalJobs: number;
  totalPages: number;
  totalUsers: number;
  totalPrinters: number;
  totalCostCenters: number;
};

export type RankingItem = {
  name: string;
  code?: string | null;
  totalJobs: number;
  totalPages: number;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function queryString(params?: Record<string, string | number | undefined>) {
  if (!params) return "";

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  let body = options.body as BodyInit | undefined;

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? "Erro na requisição.");
  }

  return data as T;
}

export const api = {
  login(email: string, password: string) {
    return apiFetch<{ user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  logout() {
    return apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
  },
  me() {
    return apiFetch<{ user: User }>("/auth/me");
  },
  summary(filters: PrintJobFilters) {
    return apiFetch<Summary>(`/analytics/summary${queryString(filters)}`);
  },
  byCostCenter(filters: PrintJobFilters) {
    return apiFetch<{ items: RankingItem[] }>(
      `/analytics/by-cost-center${queryString(filters)}`,
    );
  },
  byUser(filters: PrintJobFilters) {
    return apiFetch<{ items: RankingItem[] }>(
      `/analytics/by-user${queryString(filters)}`,
    );
  },
  byPrinter(filters: PrintJobFilters) {
    return apiFetch<{ items: RankingItem[] }>(
      `/analytics/by-printer${queryString(filters)}`,
    );
  },
  printJobs(filters: PrintJobFilters) {
    return apiFetch<{ items: PrintJob[]; pagination: Pagination }>(
      `/print-jobs${queryString(filters)}`,
    );
  },
  costCenters() {
    return apiFetch<{ items: CostCenter[] }>("/cost-centers");
  },
  printers() {
    return apiFetch<{ items: Printer[] }>("/printers");
  },
  syncPrinters() {
    return apiFetch<{ syncedAt: string; total: number }>("/printers/sync", {
      method: "POST",
    });
  },
  imports(page = 1) {
    return apiFetch<{ items: ImportBatch[]; pagination: Pagination }>(
      `/imports${queryString({ page, pageSize: 10 })}`,
    );
  },
  uploadCsv(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    return apiFetch<{
      batch: ImportBatch;
      warnings: string[];
      rowErrors: string[];
    }>("/imports/upload", {
      method: "POST",
      body: formData,
    });
  },
  importLatestFolder() {
    return apiFetch<{
      batch: ImportBatch;
      warnings: string[];
      rowErrors: string[];
    }>("/imports/folder/latest", {
      method: "POST",
    });
  },
};
