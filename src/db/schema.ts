import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/** Client-owned soundscape session; optional user_id reserved for future auth */
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: varchar("user_id", { length: 128 }),
    label: text("label"),
    metadata: jsonb("metadata"),
    soundscapeEnvelope: jsonb("soundscape_envelope"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    sessionsUserIdIdx: index("sessions_user_id_idx").on(t.userId),
  }),
);

/** Cached preference summary text derived from recent interactions per session */
export const preferenceProfiles = pgTable(
  "preference_profiles",
  {
    sessionId: varchar("session_id", { length: 128 })
      .primaryKey()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 128 }),
    summaryText: text("summary_text").notNull().default(""),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    preferenceProfilesUserIdIdx: index("preference_profiles_user_id_idx").on(t.userId),
  }),
);

export const journals = pgTable(
  "journals",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    sessionId: text("session_id"),
    userId: varchar("user_id", { length: 128 }),
    moodText: text("mood_text"),
    clientMutationId: text("client_mutation_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    journalsClientMutationUidx: uniqueIndex("journals_client_mutation_uidx").on(t.clientMutationId),
    journalsSessionCreatedIdx: index("journals_session_id_created_at_idx").on(t.sessionId, t.createdAt),
    journalsUserCreatedIdx: index("journals_user_id_created_at_idx").on(t.userId, t.createdAt),
  }),
);

export const interactions = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    musicParams: jsonb("music_params").notNull(),
    userResponse: text("user_response").notNull(),
    sessionId: text("session_id"),
    userId: varchar("user_id", { length: 128 }),
    moodText: text("mood_text"),
    moodSignalIntent: jsonb("mood_signal_intent"),
    schemaVersion: integer("schema_version"),
    clientEngine: text("client_engine"),
    clientMutationId: text("client_mutation_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    sessionCreatedIdx: index("interactions_session_id_created_at_idx").on(
      t.sessionId,
      t.createdAt,
    ),
    interactionsClientMutationUidx: uniqueIndex("interactions_client_mutation_uidx").on(t.clientMutationId),
    interactionsUserCreatedIdx: index("interactions_user_id_created_at_idx").on(t.userId, t.createdAt),
  }),
);
