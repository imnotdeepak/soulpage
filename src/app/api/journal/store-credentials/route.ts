import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/journal/store-credentials
 * Stores encrypted passphrase and recovery key in the database
 * The encryption is done client-side using the user's login password
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
    const { encryptedPassphrase, encryptedRecoveryKey } = body;

    console.log("[store-credentials] Received data:", {
      hasEncryptedPassphrase: !!encryptedPassphrase,
      hasEncryptedRecoveryKey: !!encryptedRecoveryKey,
      encryptedPassphraseType: typeof encryptedPassphrase,
      encryptedRecoveryKeyType: typeof encryptedRecoveryKey,
      encryptedPassphraseLength: encryptedPassphrase?.length,
      encryptedRecoveryKeyLength: encryptedRecoveryKey?.length,
      encryptedPassphrasePreview: encryptedPassphrase?.substring(0, 50),
      encryptedRecoveryKeyPreview: encryptedRecoveryKey?.substring(0, 50),
      userId: session.user.id,
    });

    if (!encryptedPassphrase || !encryptedRecoveryKey) {
      console.error("[store-credentials] Missing data:", {
        encryptedPassphrase: !!encryptedPassphrase,
        encryptedRecoveryKey: !!encryptedRecoveryKey,
        bodyKeys: Object.keys(body),
      });
      return NextResponse.json(
        { error: "Missing encrypted passphrase or recovery key" },
        { status: 400 }
      );
    }

    // Ensure values are strings (not null/undefined)
    const passphraseValue =
      typeof encryptedPassphrase === "string" ? encryptedPassphrase : null;
    const recoveryKeyValue =
      typeof encryptedRecoveryKey === "string" ? encryptedRecoveryKey : null;

    if (!passphraseValue || !recoveryKeyValue) {
      console.error("[store-credentials] Invalid data types:", {
        passphraseValue: !!passphraseValue,
        recoveryKeyValue: !!recoveryKeyValue,
      });
      return NextResponse.json(
        { error: "Invalid encrypted data format" },
        { status: 400 }
      );
    }

    // Update user record with encrypted credentials
    const result = await db
      .update(user)
      .set({
        encryptedPassphrase: passphraseValue,
        encryptedRecoveryKey: recoveryKeyValue,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))
      .returning();

    console.log("[store-credentials] Update result:", {
      updated: result.length > 0,
      userId: result[0]?.id,
      encryptedPassphrase: result[0]?.encryptedPassphrase
        ? `${result[0].encryptedPassphrase.substring(0, 30)}...`
        : "null",
      encryptedRecoveryKey: result[0]?.encryptedRecoveryKey
        ? `${result[0].encryptedRecoveryKey.substring(0, 30)}...`
        : "null",
    });

    return NextResponse.json({
      success: true,
      message: "Credentials stored successfully",
    });
  } catch (error: any) {
    console.error("Error storing credentials:", error);
    return NextResponse.json(
      {
        error: "Failed to store credentials",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
