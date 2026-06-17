import type { FastifyInstance } from "fastify";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  publicUser,
  readSessionToken,
  requireAuth,
  setSessionCookie,
  validateCredentials,
} from "./auth.service.js";
import { badRequest, unauthorized } from "../../utils/http.js";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;

    if (!email || !password) {
      throw badRequest("Informe email e senha.");
    }

    const user = await validateCredentials(email, password);
    if (!user) {
      throw unauthorized("Credenciais inválidas.");
    }

    const session = await createSession(user.id);
    setSessionCookie(reply, session.token, session.expiresAt);

    return { user: publicUser(user) };
  });

  app.post("/logout", { preHandler: requireAuth }, async (request, reply) => {
    const token = readSessionToken(request);
    if (token) {
      await deleteSession(token);
    }

    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/me", { preHandler: requireAuth }, async (request) => {
    return { user: request.currentUser };
  });
}
