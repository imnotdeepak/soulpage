import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user, journalEntry } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DEK Model: Check if user has a DEK set up
    // This is the primary indicator that they've created a passphrase
    const [userRecord] = await db
      .select({
        encryptedDekPassphrase: user.encryptedDekPassphrase,
        encryptedDekRecovery: user.encryptedDekRecovery,
        passphraseSalt: user.passphraseSalt,
        recoverySalt: user.recoverySalt,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    const hasDEK =
      !!userRecord?.encryptedDekPassphrase &&
      !!userRecord?.encryptedDekRecovery &&
      !!userRecord?.passphraseSalt &&
      !!userRecord?.recoverySalt;

    // Also check for journal entries (for legacy users who might not have DEK yet)
    const [entryResult] = await db
      .select({ count: count() })
      .from(journalEntry)
      .where(eq(journalEntry.userId, session.user.id));

    const entryCount = entryResult?.count || 0;
    const hasEntries = entryCount > 0;

    // User has passphrase if they have DEK OR entries (legacy support)
    const hasPassphrase = hasDEK || hasEntries;

    console.log(
      `[check-passphrase] User ${session.user.id} - hasDEK: ${hasDEK}, hasEntries: ${hasEntries}, hasPassphrase: ${hasPassphrase}`
    );

    return NextResponse.json({
      success: true,
      hasPassphrase,
      hasDEK,
      entryCount, // Include for debugging
    });
  } catch (error: any) {
    console.error("Error checking passphrase status:", error);
    return NextResponse.json(
      {
        error: "Failed to check passphrase status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
