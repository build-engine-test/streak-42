/**
 * Canonical Drizzle schema for the Streak app.
 *
 * Translated from `db_schema.reference.json`. This file is the source of
 * truth for the database structure consumed by application code.
 * New columns/tables must arrive through additional migration files;
 * never edit the canonical reference in place.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  bigint,
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Better Auth core tables                                             */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    sessionUserIdx: index("session_user_idx").on(table.userId),
  }),
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    accountUserIdx: index("account_user_idx").on(table.userId),
  }),
);

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/* ------------------------------------------------------------------ */
/* Application tables                                                  */
/* ------------------------------------------------------------------ */

export type Cadence = "daily" | "weekdays";

export const habits = pgTable(
  "habits",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    cadence: text("cadence").notNull().$type<Cadence>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    habitsNameLenCheck: check(
      "habits_name_length_check",
      sql.raw("length(name) BETWEEN 1 AND 60"),
    ),
    habitsCadenceCheck: check(
      "habits_cadence_check",
      sql.raw("cadence IN ('daily','weekdays')"),
    ),
    habitsUserIdIdx: index("habits_user_id_idx").on(table.userId),
    habitsUserCreatedIdx: index("habits_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const checkIns = pgTable(
  "check_ins",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    habitId: bigint("habit_id", { mode: "bigint" })
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    occurredOn: date("occurred_on").notNull().default(sql`current_date`),
  },
  (table) => ({
    checkInsHabitOccurredUnique: uniqueIndex("check_ins_habit_occurred_unique")
      .on(table.habitId, table.occurredOn),
    checkInsUserOccurredIdx: index("check_ins_user_occurred_idx").on(
      table.userId,
      table.occurredOn.desc(),
    ),
    checkInsHabitOccurredIdx: index("check_ins_habit_occurred_idx").on(
      table.habitId,
      table.occurredOn,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/* Inferred row types                                                  */
/* ------------------------------------------------------------------ */

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
