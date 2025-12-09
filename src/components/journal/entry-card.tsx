"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { decryptAndDecompress } from "@/lib/encryption";
import { getSessionKey } from "@/lib/session-key";
import { EntryViewModal } from "./entry-view-modal";
import { Calendar, Hash, Smile, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EntryCardProps {
  entry: {
    id: string;
    title?: string | null;
    mood?: string | null;
    tags?: string[];
    wordCount: number;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  onEdit?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load content on mount to show preview
  useEffect(() => {
    const loadContent = async () => {
      if (content !== null) return; // Already loaded

      setIsLoading(true);
      try {
        const sessionKey = getSessionKey();
        if (!sessionKey) {
          return; // Session not available, will show word count
        }

        const response = await fetch(`/api/journal/entries/${entry.id}`);
        if (!response.ok) {
          return; // Failed to fetch, will show word count
        }

        const result = await response.json();
        if (!result.success || !result.entry) {
          return; // Entry not found, will show word count
        }

        const decrypted = await decryptAndDecompress(
          result.entry.encryptedContent,
          result.entry.iv,
          sessionKey
        );

        setContent(decrypted);
      } catch (error) {
        // Silently fail - will show word count as fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]); // Only run once per entry

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = hours.toString().padStart(2, "0");
    return `${month} ${day}, ${year} at ${hoursStr}:${minutes} ${ampm}`;
  };

  const formatShortDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    // Load content if not already loaded, then open modal
    if (content === null && !isLoading) {
      setIsLoading(true);
      try {
        const sessionKey = getSessionKey();
        if (!sessionKey) {
          toast.error("Session expired. Please unlock your journal again.");
          return;
        }

        const response = await fetch(`/api/journal/entries/${entry.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch entry");
        }

        const result = await response.json();
        if (!result.success || !result.entry) {
          throw new Error("Entry not found");
        }

        const decrypted = await decryptAndDecompress(
          result.entry.encryptedContent,
          result.entry.iv,
          sessionKey
        );

        setContent(decrypted);
        setIsModalOpen(true);
      } catch (error: any) {
        toast.error(error.message || "Failed to load entry content");
      } finally {
        setIsLoading(false);
      }
    } else if (content) {
      setIsModalOpen(true);
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group aspect-square flex flex-col"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {entry.title ? (
              <h3 className="text-lg font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                {entry.title}
              </h3>
            ) : (
              <h3 className="text-lg font-semibold mb-1 text-muted-foreground line-clamp-2">
                Untitled Entry
              </h3>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              <span>{formatShortDate(entry.createdAt)}</span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(entry.id);
                }}
                className="size-7"
              >
                <Edit className="size-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.id);
                }}
                className="size-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0 pb-3">
        <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
          {entry.mood && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Smile className="size-3" />
              {entry.mood}
            </span>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <>
              {entry.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                >
                  <Hash className="size-3" />
                  {tag}
                </span>
              ))}
              {entry.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{entry.tags.length - 2}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {content ? (
            <>
              <div className="text-sm whitespace-pre-wrap line-clamp-4 text-muted-foreground leading-relaxed overflow-hidden flex-1">
                {content}
              </div>
              {content.length > 200 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  className="mt-2 text-xs text-primary hover:underline self-start"
                >
                  Read more...
                </button>
              )}
            </>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-xs text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground/50 mb-1">
                  {entry.wordCount}
                </div>
                <div className="text-xs text-muted-foreground">words</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {content && (
        <EntryViewModal
          entry={entry}
          content={content}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </Card>
  );
}
