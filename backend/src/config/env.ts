import dotenv from "dotenv";

dotenv.config();

function readNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: readNumber("PORT", 3333),
  host: process.env.HOST ?? "0.0.0.0",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  sessionSecret:
    process.env.SESSION_SECRET ?? "dev-only-change-this-session-secret",
  sessionCookieName:
    process.env.SESSION_COOKIE_NAME ?? "printer_audition_session",
  sessionDays: readNumber("SESSION_DAYS", 7),
  papercutImportFolder: process.env.PAPERCUT_IMPORT_FOLDER,
};

export const isProduction = env.nodeEnv === "production";
