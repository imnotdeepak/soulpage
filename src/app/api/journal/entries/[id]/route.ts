import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { journalEntry } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// GET /api/journal/entries/[id] - Get a single journal entry (with encrypted content)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: entryId } = await params;

    // Query entry (including encrypted content and IV for decryption)
    const [entry] = await db
      .select()
      .from(journalEntry)
      .where(
        and(
          eq(journalEntry.id, entryId),
          eq(journalEntry.userId, session.user.id)
        )
      )
      .limit(1);

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Parse tags from JSON
    const parsedTags = entry.tags ? JSON.parse(entry.tags) : [];

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        encryptedContent: entry.encryptedContent,
        iv: entry.iv,
        encryptedSummary: entry.encryptedSummary,
        title: entry.title,
        mood: entry.mood,
        tags: parsedTags,
        wordCount: entry.wordCount,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching journal entry:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch journal entry",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/journal/entries/[id] - Update a journal entry
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: entryId } = await params;

    // Verify entry exists and belongs to user
    const [existingEntry] = await db
      .select()
      .from(journalEntry)
      .where(
        and(
          eq(journalEntry.id, entryId),
          eq(journalEntry.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const {
      encryptedContent,
      iv,
      encryptedSummary,
      title,
      mood,
      tags,
      wordCount,
    } = body;

    // Build update object (only include provided fields)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (encryptedContent !== undefined && iv !== undefined) {
      if (typeof encryptedContent !== "string" || typeof iv !== "string") {
        return NextResponse.json(
          { error: "Invalid encrypted content format" },
          { status: 400 }
        );
      }
      updateData.encryptedContent = encryptedContent;
      updateData.iv = iv;
    }

    if (encryptedSummary !== undefined) {
      updateData.encryptedSummary = encryptedSummary || null;
    }

    if (title !== undefined) {
      updateData.title = title || null;
    }

    if (mood !== undefined) {
      updateData.mood = mood || null;
    }

    if (tags !== undefined) {
      // Parse tags
      let tagArray: string[] = [];
      if (tags) {
        if (typeof tags === "string") {
          try {
            tagArray = JSON.parse(tags);
          } catch {
            tagArray = tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
          }
        } else if (Array.isArray(tags)) {
          tagArray = tags;
        }
      }
      updateData.tags = tagArray.length > 0 ? JSON.stringify(tagArray) : null;
    }

    if (wordCount !== undefined) {
      updateData.wordCount = Math.max(0, Math.floor(wordCount || 0));
    }

    // Update entry
    const [updatedEntry] = await db
      .update(journalEntry)
      .set(updateData)
      .where(
        and(
          eq(journalEntry.id, entryId),
          eq(journalEntry.userId, session.user.id)
        )
      )
      .returning();

    // Parse tags from JSON
    const parsedTags = updatedEntry.tags ? JSON.parse(updatedEntry.tags) : [];

    return NextResponse.json({
      success: true,
      entry: {
        id: updatedEntry.id,
        title: updatedEntry.title,
        mood: updatedEntry.mood,
        tags: parsedTags,
        wordCount: updatedEntry.wordCount,
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error updating journal entry:", error);
    return NextResponse.json(
      {
        error: "Failed to update journal entry",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/journal/entries/[id] - Delete a journal entry
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: entryId } = await params;

    // Verify entry exists and belongs to user
    const [existingEntry] = await db
      .select()
      .from(journalEntry)
      .where(
        and(
          eq(journalEntry.id, entryId),
          eq(journalEntry.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Delete entry
    await db
      .delete(journalEntry)
      .where(
        and(
          eq(journalEntry.id, entryId),
          eq(journalEntry.userId, session.user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting journal entry:", error);
    return NextResponse.json(
      {
        error: "Failed to delete journal entry",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
