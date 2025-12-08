"use client";

import { useState } from "react";
import { PassphraseGate } from "@/components/passphrase/passphrase-gate";
import { EntryEditor } from "@/components/journal/entry-editor";
import { Timeline } from "@/components/journal/timeline";
import { Logout } from "@/components/logout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);

  const handleNewEntry = () => {
    setEditingEntryId(null);
    setShowEditor(true);
  };

  const handleSaveEntry = (_entryId: string) => {
    setShowEditor(false);
    setEditingEntryId(null);
    // Refresh timeline by changing key
    setTimelineKey((prev) => prev + 1);
  };

  const handleCancelEditor = () => {
    setShowEditor(false);
    setEditingEntryId(null);
  };

  const handleEditEntry = (entryId: string) => {
    setEditingEntryId(entryId);
    setShowEditor(true);
  };

  return (
    <PassphraseGate>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Your Journal
              </h1>
              <p className="text-muted-foreground mt-1">
                Capture your thoughts and memories
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!showEditor && (
                <Button
                  onClick={handleNewEntry}
                  size="lg"
                  className="shadow-md"
                >
                  <Plus className="size-4 mr-2" />
                  New Entry
                </Button>
              )}
              <Logout />
            </div>
          </div>

          {showEditor ? (
            <EntryEditor
              entryId={editingEntryId || undefined}
              onSave={handleSaveEntry}
              onCancel={handleCancelEditor}
            />
          ) : (
            <Timeline key={timelineKey} onEditEntry={handleEditEntry} />
          )}
        </div>
      </div>
    </PassphraseGate>
  );
}
