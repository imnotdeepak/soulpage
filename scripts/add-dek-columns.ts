/**
 * Script to add DEK (Data Encryption Key) columns to the user table
 * This script is idempotent - it can be run multiple times safely
 */

import { config } from "dotenv";
import { db } from "../src/db/db";
import { sql } from "drizzle-orm";

config({ path: ".env" });

async function addDekColumns() {
  try {
    console.log("Checking if DEK columns exist...");

    // Check if columns already exist
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name IN (
        'encrypted_dek_passphrase',
        'iv_dek_passphrase',
        'passphrase_salt',
        'encrypted_dek_recovery',
        'iv_dek_recovery',
        'recovery_salt'
      );
    `);

    const existingColumns = (checkResult.rows || []).map(
      (row: any) => row.column_name
    );

    // Add encrypted_dek_passphrase (BYTEA for binary encrypted data)
    if (existingColumns.includes("encrypted_dek_passphrase")) {
      console.log("✅ encrypted_dek_passphrase column already exists");
    } else {
      console.log("Adding encrypted_dek_passphrase column (BYTEA)...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "encrypted_dek_passphrase" bytea;
      `);
      console.log("✅ encrypted_dek_passphrase column added");
    }

    // Add iv_dek_passphrase (BYTEA for binary IV)
    if (existingColumns.includes("iv_dek_passphrase")) {
      console.log("✅ iv_dek_passphrase column already exists");
    } else {
      console.log("Adding iv_dek_passphrase column (BYTEA)...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "iv_dek_passphrase" bytea;
      `);
      console.log("✅ iv_dek_passphrase column added");
    }

    // Add passphrase_salt
    if (existingColumns.includes("passphrase_salt")) {
      console.log("✅ passphrase_salt column already exists");
    } else {
      console.log("Adding passphrase_salt column...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "passphrase_salt" text;
      `);
      console.log("✅ passphrase_salt column added");
    }

    // Add encrypted_dek_recovery (BYTEA for binary encrypted data)
    if (existingColumns.includes("encrypted_dek_recovery")) {
      console.log("✅ encrypted_dek_recovery column already exists");
    } else {
      console.log("Adding encrypted_dek_recovery column (BYTEA)...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "encrypted_dek_recovery" bytea;
      `);
      console.log("✅ encrypted_dek_recovery column added");
    }

    // Add iv_dek_recovery (BYTEA for binary IV)
    if (existingColumns.includes("iv_dek_recovery")) {
      console.log("✅ iv_dek_recovery column already exists");
    } else {
      console.log("Adding iv_dek_recovery column (BYTEA)...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "iv_dek_recovery" bytea;
      `);
      console.log("✅ iv_dek_recovery column added");
    }

    // Add recovery_salt
    if (existingColumns.includes("recovery_salt")) {
      console.log("✅ recovery_salt column already exists");
    } else {
      console.log("Adding recovery_salt column...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "recovery_salt" text;
      `);
      console.log("✅ recovery_salt column added");
    }

    console.log("✅ DEK columns migration complete!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

addDekColumns().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
