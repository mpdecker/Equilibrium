import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  musicParams: jsonb("music_params").notNull(), 
  userResponse: text("user_response").notNull(), // like 'positive', 'negative', or detailed text
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
