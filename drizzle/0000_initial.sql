CREATE TABLE IF NOT EXISTS "journals" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"music_params" jsonb NOT NULL,
	"user_response" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
