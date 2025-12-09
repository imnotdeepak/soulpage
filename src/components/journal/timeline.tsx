"use client";

import { useState, useEffect } from "react";
import { EntryCard } from "./entry-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Entry {
  id: string;
  title?: string | null;
  mood?: string | null;
  tags?: string[];
  wordCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface TimelineProps {
  onEditEntry?: (entryId: string) => void;
}

export function Timeline({ onEditEntry }: TimelineProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEntries = async () => {
    try {
      const response = await fetch(
        "/api/journal/entries?limit=50&orderBy=desc"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const result = await response.json();
      if (result.success) {
        setEntries(result.entries || []);
      } else {
        throw new Error(result.error || "Failed to fetch entries");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load entries");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEntries();
  };

  const handleDelete = async (entryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this entry? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/journal/entries/${entryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }

      toast.success("Entry deleted");
      // Remove from local state
      setEntries(entries.filter((e) => e.id !== entryId));
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entry");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No entries yet. Start writing to see them here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Your Entries ({entries.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={onEditEntry}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
