import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { journalEntry } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/journal/re-encrypt-entries
 * Re-encrypts all entries with a new encryption key
 * This is used when the user changes their passphrase
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Entries must be an array" },
        { status: 400 }
      );
    }

    // Update each entry
    const updatePromises = entries.map(
      async (entry: {
        id: string;
        encryptedContent: string;
        iv: string;
        encryptedSummary?: string | null;
      }) => {
        return db
          .update(journalEntry)
          .set({
            encryptedContent: entry.encryptedContent,
            iv: entry.iv,
            encryptedSummary: entry.encryptedSummary || null,
            updatedAt: new Date(),
          })
          .where(eq(journalEntry.id, entry.id));
      }
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Successfully re-encrypted ${entries.length} entries`,
      count: entries.length,
    });
  } catch (error: any) {
    console.error("Error re-encrypting entries:", error);
    return NextResponse.json(
      {
        error: "Failed to re-encrypt entries",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
