"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Calendar, Hash, Smile, Edit, Trash2 } from "lucide-react";

interface EntryViewModalProps {
  entry: {
    id: string;
    title?: string | null;
    mood?: string | null;
    tags?: string[];
    wordCount: number;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
}

export function EntryViewModal({
  entry,
  content,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: EntryViewModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, "0");
    return `${month} ${day}, ${year} at ${hoursStr}:${minutes} ${ampm}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl mb-2">
                {entry.title || "Untitled Entry"}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-4" />
                  {formatDate(entry.createdAt)}
                </span>
                <span>{entry.wordCount} words</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {entry.mood && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                    <Smile className="size-4" />
                    {entry.mood}
                  </span>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <>
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                      >
                        <Hash className="size-4" />
                        {tag}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onEdit(entry.id);
                    onClose();
                  }}
                >
                  <Edit className="size-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to delete this entry?")
                    ) {
                      onDelete(entry.id);
                      onClose();
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pt-6">
          <div className="prose prose-lg max-w-none whitespace-pre-wrap text-base leading-relaxed">
            {content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
