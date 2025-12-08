import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  customType,
} from "drizzle-orm/pg-core";

// Custom BYTEA type for storing binary encrypted data
const bytea = customType<{ data: Buffer | Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (value: Buffer | Uint8Array) => {
    if (value instanceof Buffer) return value;
    return Buffer.from(value);
  },
  fromDriver: (value: Buffer) => value,
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // DEK Model: Encrypted Data Encryption Key (DEK)
  // DEK is encrypted with KEK_passphrase (derived from passphrase)
  // Using BYTEA for binary encrypted data (more efficient than TEXT)
  encryptedDekPassphrase: bytea("encrypted_dek_passphrase"),
  ivDekPassphrase: bytea("iv_dek_passphrase"),
  passphraseSalt: text("passphrase_salt"), // Salt is text (base64 string)
  // DEK is also encrypted with KEK_recovery (derived from recovery key)
  encryptedDekRecovery: bytea("encrypted_dek_recovery"),
  ivDekRecovery: bytea("iv_dek_recovery"),
  recoverySalt: text("recovery_salt"), // Salt is text (base64 string)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Encrypted content (compressed + encrypted)
    encryptedContent: text("encrypted_content").notNull(),
    // Initialization vector for decryption
    iv: text("iv").notNull(),
    // Optional encrypted AI summary
    encryptedSummary: text("encrypted_summary"),
    // Metadata (stored unencrypted for timeline/search)
    title: text("title"),
    mood: text("mood"),
    tags: text("tags"), // JSON array stored as text (will parse/stringify)
    wordCount: integer("word_count").default(0).notNull(),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("journal_entry_userId_idx").on(table.userId),
    index("journal_entry_createdAt_idx").on(table.createdAt),
    index("journal_entry_userId_createdAt_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  journalEntries: many(journalEntry),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const journalEntryRelations = relations(journalEntry, ({ one }) => ({
  user: one(user, {
    fields: [journalEntry.userId],
    references: [user.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  journalEntry,
};
