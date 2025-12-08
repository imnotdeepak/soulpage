import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Adding IV column to journal_entry table...");

    // Check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'journal_entry' AND column_name = 'iv';
    `);

    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: "IV column already exists",
      });
    }

    // Add IV column
    await db.execute(sql`
      ALTER TABLE "journal_entry" 
      ADD COLUMN "iv" text;
    `);

    // Check if there are any existing rows
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM "journal_entry";
    `);
    const count = parseInt((countResult.rows[0] as any)?.count || "0", 10);

    if (count === 0) {
      // No existing rows, can safely set NOT NULL
      await db.execute(sql`
        ALTER TABLE "journal_entry" 
        ALTER COLUMN "iv" SET NOT NULL;
      `);
      console.log("IV column added with NOT NULL constraint");
    } else {
      // There are existing rows - we need to handle this
      // For now, we'll set a default empty string and then make it NOT NULL
      // But actually, we can't do that for existing encrypted data
      // So we'll leave it nullable for now and warn the user
      console.log(
        "Warning: Existing entries found. IV column added as nullable."
      );
      return NextResponse.json({
        success: true,
        message:
          "IV column added (nullable). Existing entries will need to be migrated.",
        warning: "You have existing entries that need IV values",
      });
    }

    return NextResponse.json({
      success: true,
      message: "IV column added successfully",
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error,
      },
      { status: 500 }
    );
  }
}
