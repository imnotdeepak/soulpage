import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { journalEntry } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// ============================================================================
// POST /api/journal/entries - Create a new journal entry
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Validate required fields
    if (!encryptedContent || !iv) {
      return NextResponse.json(
        { error: "Missing required fields: encryptedContent and iv" },
        { status: 400 }
      );
    }

    // Validate encrypted content format (should be base64 string)
    if (typeof encryptedContent !== "string" || typeof iv !== "string") {
      return NextResponse.json(
        { error: "Invalid encrypted content format" },
        { status: 400 }
      );
    }

    // Validate word count
    const validatedWordCount = Math.max(0, Math.floor(wordCount || 0));

    // Parse tags (should be array or JSON string)
    let parsedTags: string[] = [];
    if (tags) {
      if (typeof tags === "string") {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          // If not JSON, treat as comma-separated string
          parsedTags = tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Store tags as JSON string
    const tagsJson = parsedTags.length > 0 ? JSON.stringify(parsedTags) : null;

    // Generate unique ID for entry
    const entryId = randomUUID();

    // Insert entry into database
    const [entry] = await db
      .insert(journalEntry)
      .values({
        id: entryId,
        userId: session.user.id,
        encryptedContent,
        iv,
        encryptedSummary: encryptedSummary || null,
        title: title || null,
        mood: mood || null,
        tags: tagsJson,
        wordCount: validatedWordCount,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        entry: {
          id: entry.id,
          title: entry.title,
          mood: entry.mood,
          tags: entry.tags ? JSON.parse(entry.tags) : [],
          wordCount: entry.wordCount,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating journal entry:", error);
    return NextResponse.json(
      {
        error: "Failed to create journal entry",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/journal/entries - Get user's journal entries (metadata only)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const orderBy = searchParams.get("orderBy") || "desc"; // 'asc' or 'desc'

    // Query entries (metadata only - no encrypted content)
    const entries = await db
      .select({
        id: journalEntry.id,
        title: journalEntry.title,
        mood: journalEntry.mood,
        tags: journalEntry.tags,
        wordCount: journalEntry.wordCount,
        createdAt: journalEntry.createdAt,
        updatedAt: journalEntry.updatedAt,
      })
      .from(journalEntry)
      .where(eq(journalEntry.userId, session.user.id))
      .orderBy(
        orderBy === "asc"
          ? asc(journalEntry.createdAt)
          : desc(journalEntry.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // Parse tags from JSON strings
    const entriesWithParsedTags = entries.map((entry) => ({
      ...entry,
      tags: entry.tags ? JSON.parse(entry.tags) : [],
    }));

    return NextResponse.json({
      success: true,
      entries: entriesWithParsedTags,
      count: entriesWithParsedTags.length,
    });
  } catch (error: any) {
    console.error("Error fetching journal entries:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch journal entries",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
