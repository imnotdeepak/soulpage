import { config } from "dotenv";
import { db } from "../src/db/db";
import { sql } from "drizzle-orm";

config({ path: ".env" });

async function addIVColumn() {
  try {
    console.log("Checking if IV column exists...");

    // Check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'journal_entry' AND column_name = 'iv';
    `);

    if ((checkResult.rows?.length || 0) > 0) {
      console.log("✅ IV column already exists");
      process.exit(0);
      return;
    }

    console.log("Adding IV column...");

    // Add IV column
    await db.execute(sql`
      ALTER TABLE "journal_entry" 
      ADD COLUMN "iv" text;
    `);

    // Check if there are any existing rows
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM "journal_entry";
    `);
    const count = parseInt((countResult.rows?.[0] as any)?.count || "0", 10);

    if (count === 0) {
      // No existing rows, can safely set NOT NULL
      await db.execute(sql`
        ALTER TABLE "journal_entry" 
        ALTER COLUMN "iv" SET NOT NULL;
      `);
      console.log("✅ IV column added with NOT NULL constraint");
    } else {
      console.log(
        "⚠️  Warning: Existing entries found. IV column added as nullable."
      );
      console.log("   You may need to update existing entries with IV values.");
    }

    console.log("✅ Migration complete!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

addIVColumn().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
