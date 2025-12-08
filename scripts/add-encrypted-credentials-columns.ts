import { config } from "dotenv";
import { db } from "../src/db/db";
import { sql } from "drizzle-orm";

config({ path: ".env" });

async function addEncryptedCredentialsColumns() {
  try {
    console.log("Checking if encrypted credentials columns exist...");

    // Check if columns already exist
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name IN ('encrypted_passphrase', 'encrypted_recovery_key');
    `);

    const existingColumns = (checkResult.rows || []).map(
      (row: any) => row.column_name
    );

    if (existingColumns.includes("encrypted_passphrase")) {
      console.log("✅ encrypted_passphrase column already exists");
    } else {
      console.log("Adding encrypted_passphrase column...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "encrypted_passphrase" text;
      `);
      console.log("✅ encrypted_passphrase column added");
    }

    if (existingColumns.includes("encrypted_recovery_key")) {
      console.log("✅ encrypted_recovery_key column already exists");
    } else {
      console.log("Adding encrypted_recovery_key column...");
      await db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN "encrypted_recovery_key" text;
      `);
      console.log("✅ encrypted_recovery_key column added");
    }

    console.log("✅ Migration complete!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

addEncryptedCredentialsColumns().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
