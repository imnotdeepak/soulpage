import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/journal/get-credentials
 * Retrieves encrypted passphrase and recovery key from the database
 * Decryption happens client-side using the user's login password
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user record with encrypted credentials
    const [userRecord] = await db
      .select({
        encryptedPassphrase: user.encryptedPassphrase,
        encryptedRecoveryKey: user.encryptedRecoveryKey,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      encryptedPassphrase: userRecord.encryptedPassphrase,
      encryptedRecoveryKey: userRecord.encryptedRecoveryKey,
      hasStoredCredentials:
        !!userRecord.encryptedPassphrase && !!userRecord.encryptedRecoveryKey,
    });
  } catch (error: any) {
    console.error("Error retrieving credentials:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve credentials",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
