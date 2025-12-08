"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  compressAndEncrypt,
  calculateWordCount,
  decryptAndDecompress,
} from "@/lib/encryption";
import { getSessionKey } from "@/lib/session-key";
import { Save, X, Hash, Smile, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EntryEditorProps {
  onSave?: (entryId: string) => void;
  onCancel?: () => void;
  initialContent?: string;
  initialTitle?: string;
  initialMood?: string;
  initialTags?: string[];
  entryId?: string; // If provided, this is an edit operation
}

export function EntryEditor({
  onSave,
  onCancel,
  initialContent = "",
  initialTitle = "",
  initialMood = "",
  initialTags = [],
  entryId,
}: EntryEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [mood, setMood] = useState(initialMood);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = calculateWordCount(content);

  // Load entry content when editing (only if entryId is provided and no initialContent)
  useEffect(() => {
    if (entryId && !initialContent && !content) {
      loadEntryContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  const loadEntryContent = async () => {
    if (!entryId) return;

    setIsLoading(true);
    try {
      const sessionKey = getSessionKey();
      if (!sessionKey) {
        toast.error("Session expired. Please unlock your journal again.");
        return;
      }

      const response = await fetch(`/api/journal/entries/${entryId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch entry");
      }

      const result = await response.json();
      if (!result.success || !result.entry) {
        throw new Error("Entry not found");
      }

      // Decrypt and decompress content
      const decrypted = await decryptAndDecompress(
        result.entry.encryptedContent,
        result.entry.iv,
        sessionKey
      );

      // Set all fields
      setContent(decrypted);
      setTitle(result.entry.title || "");
      setMood(result.entry.mood || "");
      setTags(result.entry.tags || []);
    } catch (error: any) {
      console.error("Error loading entry:", error);
      toast.error(error.message || "Failed to load entry");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Please write something before saving");
      return;
    }

    const sessionKey = getSessionKey();
    if (!sessionKey) {
      toast.error("Session expired. Please unlock your journal again.");
      return;
    }

    setIsSaving(true);

    try {
      // Compress and encrypt the content
      const { encrypted, iv } = await compressAndEncrypt(content, sessionKey);

      // Prepare request body
      const body: any = {
        encryptedContent: encrypted,
        iv,
        title: title.trim() || null,
        mood: mood.trim() || null,
        tags: tags.length > 0 ? tags : null,
        wordCount,
      };

      let response: Response;
      let result: any;

      if (entryId) {
        // Update existing entry
        response = await fetch(`/api/journal/entries/${entryId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        result = await response.json();
      } else {
        // Create new entry
        response = await fetch("/api/journal/entries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        result = await response.json();
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to save entry");
      }

      toast.success(entryId ? "Entry updated!" : "Entry saved!");

      if (onSave) {
        onSave(result.entry?.id || entryId);
      }
    } catch (error: any) {
      console.error("Error saving entry:", error);
      toast.error(error.message || "Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">
            {entryId ? "Edit Entry" : "New Entry"}
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your entry a title..."
            className="text-lg"
          />
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <Label htmlFor="mood" className="flex items-center gap-2">
            <Smile className="size-4" />
            Mood (optional)
          </Label>
          <Input
            id="mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="How are you feeling?"
            className="max-w-xs"
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags" className="flex items-center gap-2">
            <Hash className="size-4" />
            Tags (optional)
          </Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-primary/80"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Add a tag..."
              className="max-w-xs"
            />
            {tagInput.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
              >
                Add
              </Button>
            )}
          </div>
        </div>

        {/* Content Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Your thoughts</Label>
            <span className="text-sm text-muted-foreground">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>
          <Textarea
            ref={textareaRef}
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write freely... your thoughts are safe here."
            className="min-h-[400px] resize-none text-base leading-relaxed"
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Your entry is encrypted before saving
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
              <Save className="size-4" />
              {isSaving ? "Saving..." : entryId ? "Update" : "Save Entry"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
