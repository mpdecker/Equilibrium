ALTER TABLE "journals" ADD COLUMN "client_mutation_id" text;
ALTER TABLE "interactions" ADD COLUMN "client_mutation_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "journals_client_mutation_uidx" ON "journals" ("client_mutation_id");

CREATE UNIQUE INDEX IF NOT EXISTS "interactions_client_mutation_uidx" ON "interactions" ("client_mutation_id");
