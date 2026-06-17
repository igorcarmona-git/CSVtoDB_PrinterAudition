import crypto from "node:crypto";
import { parse } from "csv-parse/sync";
import { badRequest } from "../../utils/http.js";

const EXPECTED_COLUMN_COUNT = 14;

export type ParsedPrintJob = {
  dedupeKey: string;
  timedoc: Date;
  username: string;
  pages: number;
  copies: number;
  totalPages: number;
  printerName: string;
  documentName: string | null;
  clientPC: string | null;
  paperSize: string | null;
  languageMethod: string | null;
  height: string | null;
  width: string | null;
  duplex: string | null;
  grayscale: string | null;
  fileSize: string | null;
};

export type ParseResult = {
  jobs: ParsedPrintJob[];
  totalRows: number;
  failedRows: number;
  rowErrors: string[];
};

function cleanCell(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function requiredCell(row: string[], index: number, label: string) {
  const value = cleanCell(row[index]);
  if (!value) throw new Error(`Campo obrigatório ausente: ${label}`);
  return value;
}

function parseInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} inválido: ${value}`);
  }

  return parsed;
}

function parsePapercutDate(value: string) {
  const isoCandidate = value.replace(" ", "T");
  const nativeDate = new Date(isoCandidate);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  const brMatch = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (brMatch) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] =
      brMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  throw new Error(`Data inválida: ${value}`);
}

function createDedupeKey(parts: Array<string | number | null>) {
  return crypto
    .createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("\u001f"))
    .digest("hex");
}

function detectDelimiter(text: string) {
  const sampleLine =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? "";

  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: sampleLine.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function looksLikeHeader(row: string[]) {
  const normalized = row.map((cell) => String(cell).trim().toLowerCase());
  return (
    normalized.includes("user") ||
    normalized.includes("username") ||
    normalized.includes("printer") ||
    normalized.includes("document name")
  );
}

function normalizeRow(row: string[]) {
  if (row.length < EXPECTED_COLUMN_COUNT) {
    throw new Error(
      `Linha com ${row.length} colunas; esperado no mínimo ${EXPECTED_COLUMN_COUNT}.`,
    );
  }

  const timedoc = parsePapercutDate(requiredCell(row, 0, "timedoc"));
  const username = requiredCell(row, 1, "username");
  const pages = parseInteger(requiredCell(row, 2, "pages"), "pages");
  const copies = parseInteger(requiredCell(row, 3, "copies"), "copies");
  const printerName = requiredCell(row, 4, "printer");
  const documentName = cleanCell(row[5]);
  const clientPC = cleanCell(row[6]);
  const paperSize = cleanCell(row[7]);
  const languageMethod = cleanCell(row[8]);
  const height = cleanCell(row[9]);
  const width = cleanCell(row[10]);
  const duplex = cleanCell(row[11]);
  const grayscale = cleanCell(row[12]);
  const fileSize = cleanCell(row[13]);
  const totalPages = pages * copies;

  const dedupeKey = createDedupeKey([
    timedoc.toISOString(),
    username.toLowerCase(),
    pages,
    copies,
    printerName.toLowerCase(),
    documentName?.toLowerCase() ?? null,
    clientPC?.toLowerCase() ?? null,
    fileSize,
  ]);

  return {
    dedupeKey,
    timedoc,
    username,
    pages,
    copies,
    totalPages,
    printerName,
    documentName,
    clientPC,
    paperSize,
    languageMethod,
    height,
    width,
    duplex,
    grayscale,
    fileSize,
  };
}

export function parsePapercutCsv(buffer: Buffer): ParseResult {
  const text = buffer.toString("latin1");
  if (!text.trim()) throw badRequest("CSV vazio.");

  const records = parse(text, {
    bom: true,
    delimiter: detectDelimiter(text),
    from_line: 3,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  const rows = records.filter((row) =>
    row.some((cell) => String(cell ?? "").trim().length > 0),
  );

  if (rows.length && looksLikeHeader(rows[0])) {
    rows.shift();
  }

  const jobs: ParsedPrintJob[] = [];
  const rowErrors: string[] = [];

  rows.forEach((row, index) => {
    try {
      jobs.push(normalizeRow(row));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      rowErrors.push(`Linha ${index + 4}: ${message}`);
    }
  });

  return {
    jobs,
    totalRows: rows.length,
    failedRows: rowErrors.length,
    rowErrors,
  };
}
