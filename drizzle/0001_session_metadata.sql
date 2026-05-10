ALTER TABLE "journals" ADD COLUMN IF NOT EXISTS "session_id" varchar(128);
ALTER TABLE "journals" ADD COLUMN IF NOT EXISTS "mood_text" text;

ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "session_id" varchar(128);
ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "mood_text" text;
ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "mood_signal_intent" jsonb;
ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "schema_version" integer;
ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "client_engine" varchar(32);

CREATE INDEX IF NOT EXISTS "interactions_session_id_created_at_idx"
  ON "interactions" ("session_id", "created_at");
