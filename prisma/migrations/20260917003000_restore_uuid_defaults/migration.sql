ALTER TABLE "users"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "sessions"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "monitor_targets"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "ping_logs"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
