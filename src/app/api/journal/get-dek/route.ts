import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/journal/get-dek
 * Retrieves encrypted DEK and related data from the database
 * Decryption happens client-side using KEKs derived from passphrase/recovery key
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user record with encrypted DEK data
    const [userRecord] = await db
      .select({
        encryptedDekPassphrase: user.encryptedDekPassphrase,
        ivDekPassphrase: user.ivDekPassphrase,
        passphraseSalt: user.passphraseSalt,
        encryptedDekRecovery: user.encryptedDekRecovery,
        ivDekRecovery: user.ivDekRecovery,
        recoverySalt: user.recoverySalt,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasDEK =
      !!userRecord.encryptedDekPassphrase &&
      !!userRecord.encryptedDekRecovery &&
      !!userRecord.passphraseSalt &&
      !!userRecord.recoverySalt;

    // Convert Buffer (from BYTEA) back to base64 strings for client-side decryption
    // Encryption functions expect base64 strings
    const encryptedDekPassphraseBase64 =
      userRecord.encryptedDekPassphrase instanceof Buffer
        ? userRecord.encryptedDekPassphrase.toString("base64")
        : userRecord.encryptedDekPassphrase;
    const ivDekPassphraseBase64 =
      userRecord.ivDekPassphrase instanceof Buffer
        ? userRecord.ivDekPassphrase.toString("base64")
        : userRecord.ivDekPassphrase;
    const encryptedDekRecoveryBase64 =
      userRecord.encryptedDekRecovery instanceof Buffer
        ? userRecord.encryptedDekRecovery.toString("base64")
        : userRecord.encryptedDekRecovery;
    const ivDekRecoveryBase64 =
      userRecord.ivDekRecovery instanceof Buffer
        ? userRecord.ivDekRecovery.toString("base64")
        : userRecord.ivDekRecovery;

    return NextResponse.json({
      success: true,
      encryptedDekPassphrase: encryptedDekPassphraseBase64,
      ivDekPassphrase: ivDekPassphraseBase64,
      passphraseSalt: userRecord.passphraseSalt, // TEXT - already string
      encryptedDekRecovery: encryptedDekRecoveryBase64,
      ivDekRecovery: ivDekRecoveryBase64,
      recoverySalt: userRecord.recoverySalt, // TEXT - already string
      hasDEK,
    });
  } catch (error: any) {
    console.error("Error retrieving DEK:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve DEK",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
