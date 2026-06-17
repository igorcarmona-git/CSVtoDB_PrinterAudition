CREATE TYPE "UserRole" AS ENUM ('ADMIN');
CREATE TYPE "ImportSource" AS ENUM ('UPLOAD', 'FOLDER');
CREATE TYPE "ImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_sessions" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cost_centers" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "management" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "printers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "ip" TEXT,
  "driver" TEXT,
  "cost_center_id" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_batches" (
  "id" TEXT NOT NULL,
  "source" "ImportSource" NOT NULL,
  "file_name" TEXT,
  "file_path" TEXT,
  "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "inserted_rows" INTEGER NOT NULL DEFAULT 0,
  "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
  "failed_rows" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "print_jobs" (
  "id" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "timedoc" TIMESTAMP(3) NOT NULL,
  "username" TEXT NOT NULL,
  "pages" INTEGER NOT NULL,
  "copies" INTEGER NOT NULL,
  "total_pages" INTEGER NOT NULL,
  "printer_name" TEXT NOT NULL,
  "printer_driver" TEXT,
  "printer_ip" TEXT,
  "document_name" TEXT,
  "client_pc" TEXT,
  "paper_size" TEXT,
  "language_method" TEXT,
  "height" TEXT,
  "width" TEXT,
  "duplex" TEXT,
  "grayscale" TEXT,
  "file_size" TEXT,
  "printer_id" TEXT,
  "cost_center_id" TEXT,
  "import_batch_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE UNIQUE INDEX "cost_centers_code_key" ON "cost_centers"("code");
CREATE INDEX "cost_centers_active_idx" ON "cost_centers"("active");
CREATE UNIQUE INDEX "printers_name_key" ON "printers"("name");
CREATE INDEX "printers_cost_center_id_idx" ON "printers"("cost_center_id");
CREATE INDEX "printers_location_idx" ON "printers"("location");
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");
CREATE INDEX "import_batches_started_at_idx" ON "import_batches"("started_at");
CREATE UNIQUE INDEX "print_jobs_dedupe_key_key" ON "print_jobs"("dedupe_key");
CREATE INDEX "print_jobs_timedoc_idx" ON "print_jobs"("timedoc");
CREATE INDEX "print_jobs_username_idx" ON "print_jobs"("username");
CREATE INDEX "print_jobs_printer_name_idx" ON "print_jobs"("printer_name");
CREATE INDEX "print_jobs_client_pc_idx" ON "print_jobs"("client_pc");
CREATE INDEX "print_jobs_cost_center_id_idx" ON "print_jobs"("cost_center_id");
CREATE INDEX "print_jobs_printer_id_idx" ON "print_jobs"("printer_id");
CREATE INDEX "print_jobs_import_batch_id_idx" ON "print_jobs"("import_batch_id");

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "printers" ADD CONSTRAINT "printers_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
