ALTER TABLE "password_reset_tokens"
  RENAME COLUMN "token_hash" TO "code_hash";

ALTER TABLE "password_reset_tokens"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;