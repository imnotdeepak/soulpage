import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // User has passphrase if they have DEK
    const hasPassphrase = hasDEK;

    return NextResponse.json({
      success: true,
      hasPassphrase,
      hasDEK,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to check passphrase status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
