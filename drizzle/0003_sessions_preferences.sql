CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128),
	"label" text,
	"metadata" jsonb,
	"soundscape_envelope" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "preference_profiles" (
	"session_id" varchar(128) PRIMARY KEY NOT NULL REFERENCES "sessions" ("id") ON DELETE CASCADE,
	"user_id" varchar(128),
	"summary_text" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "preference_profiles_user_id_idx" ON "preference_profiles" ("user_id");

ALTER TABLE "journals" ADD COLUMN IF NOT EXISTS "user_id" varchar(128);
ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "user_id" varchar(128);

CREATE INDEX IF NOT EXISTS "journals_session_id_created_at_idx" ON "journals" ("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "journals_user_id_created_at_idx" ON "journals" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "interactions_user_id_created_at_idx" ON "interactions" ("user_id", "created_at");
