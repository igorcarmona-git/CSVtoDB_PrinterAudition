import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { env, isProduction } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { unauthorized } from "../../utils/http.js";

const SESSION_TOKEN_BYTES = 32;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.sessionDays);
  return expiresAt;
}

export function publicUser(user: Pick<User, "id" | "email" | "name" | "role">) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  return passwordMatches ? user : null;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  const expiresAt = sessionExpiresAt();

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function findSessionUser(token: string) {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {
      return undefined;
    });
    return null;
  }

  return publicUser(session.user);
}

export async function deleteSession(token: string) {
  await prisma.authSession
    .delete({ where: { tokenHash: hashToken(token) } })
    .catch(() => undefined);
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
) {
  reply.setCookie(env.sessionCookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    signed: true,
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(env.sessionCookieName, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    signed: true,
  });
}

export function readSessionToken(request: FastifyRequest) {
  const rawCookie = request.cookies[env.sessionCookieName];
  if (!rawCookie) return null;

  const unsigned = request.unsignCookie(rawCookie);
  if (!unsigned.valid || !unsigned.value) return null;

  return unsigned.value;
}

export async function requireAuth(request: FastifyRequest) {
  const token = readSessionToken(request);
  if (!token) {
    throw unauthorized();
  }

  const user = await findSessionUser(token);
  if (!user) {
    throw unauthorized();
  }

  request.currentUser = user;
}
