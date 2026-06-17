import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WmiPrinter = {
  name: string;
  location: string | null;
  ip: string | null;
  driver: string | null;
};

export class WmiUnsupportedError extends Error {
  constructor() {
    super("Sincronização WMI está disponível apenas em servidor Windows.");
  }
}

type RawWmiPrinter = {
  Name?: unknown;
  Location?: unknown;
  PortName?: unknown;
  DriverName?: unknown;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function readPrintersFromWmi(): Promise<WmiPrinter[]> {
  if (process.platform !== "win32") {
    throw new WmiUnsupportedError();
  }

  const command =
    "Get-CimInstance Win32_Printer | Select-Object Name,Location,PortName,DriverName | ConvertTo-Json -Depth 3";

  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { windowsHide: true, maxBuffer: 1024 * 1024 * 10 },
  );

  if (!stdout.trim()) return [];

  const parsed = JSON.parse(stdout) as RawWmiPrinter[] | RawWmiPrinter;
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows
    .map((printer) => ({
      name: normalizeText(printer.Name),
      location: normalizeText(printer.Location),
      ip: normalizeText(printer.PortName),
      driver: normalizeText(printer.DriverName),
    }))
    .filter((printer): printer is WmiPrinter => Boolean(printer.name));
}
