export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = "Não autenticado.") {
  return new HttpError(401, message);
}

export function forbidden(message = "Acesso negado.") {
  return new HttpError(403, message);
}

export function conflict(message: string, details?: unknown) {
  return new HttpError(409, message, details);
}

export function notFound(message: string) {
  return new HttpError(404, message);
}
