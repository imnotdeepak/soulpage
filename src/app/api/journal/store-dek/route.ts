import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/journal/store-dek
 * Stores encrypted DEK (Data Encryption Key) in the database
 * The DEK is encrypted with both KEK_passphrase and KEK_recovery
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
    const {
      encryptedDekPassphrase,
      ivDekPassphrase,
      passphraseSalt,
      encryptedDekRecovery,
      ivDekRecovery,
      recoverySalt,
    } = body;

    if (
      !encryptedDekPassphrase ||
      !ivDekPassphrase ||
      !passphraseSalt ||
      !encryptedDekRecovery ||
      !ivDekRecovery ||
      !recoverySalt
    ) {
      return NextResponse.json(
        { error: "Missing required DEK fields" },
        { status: 400 }
      );
    }

    // Convert base64 strings to Buffer for BYTEA storage
    // Encryption functions return base64 strings, but BYTEA stores binary data
    const encryptedDekPassphraseBuffer = Buffer.from(
      encryptedDekPassphrase.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    const ivDekPassphraseBuffer = Buffer.from(
      ivDekPassphrase.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    const encryptedDekRecoveryBuffer = Buffer.from(
      encryptedDekRecovery.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    const ivDekRecoveryBuffer = Buffer.from(
      ivDekRecovery.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );

    // Update user record with encrypted DEK (BYTEA columns get Buffer, TEXT columns get strings)
    const result = await db
      .update(user)
      .set({
        encryptedDekPassphrase: encryptedDekPassphraseBuffer,
        ivDekPassphrase: ivDekPassphraseBuffer,
        passphraseSalt, // TEXT - stays as string
        encryptedDekRecovery: encryptedDekRecoveryBuffer,
        ivDekRecovery: ivDekRecoveryBuffer,
        recoverySalt, // TEXT - stays as string
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "DEK stored successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to store DEK",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
