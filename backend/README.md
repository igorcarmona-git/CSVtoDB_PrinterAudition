# Backend CSVtoDB Printer Audition

API Fastify + Prisma para importar CSVs do PaperCut, sincronizar impressoras via WMI no Windows e consultar indicadores.

## Configuração

1. Copie `.env.example` para `.env`.
2. Ajuste `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `PAPERCUT_IMPORT_FOLDER`.
3. Instale dependências com `npm install`.
4. Rode `npm run prisma:migrate`.
5. Rode `npm run seed`.
6. Inicie com `npm run dev`.

## Endpoints principais

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /health`
- `GET /print-jobs`
- `GET /analytics/summary`
- `GET /analytics/by-cost-center`
- `GET /analytics/by-user`
- `GET /analytics/by-printer`
- `GET /printers`
- `POST /printers/sync`
- `GET /cost-centers`
- `POST /cost-centers`
- `GET /imports`
- `POST /imports/upload`
- `POST /imports/folder/latest`
