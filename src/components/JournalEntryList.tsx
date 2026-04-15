"use client";

import { BookOpen } from "lucide-react";
import { GroupedEntries } from "@/lib/useJournal";
import { Id } from "../../convex/_generated/dataModel";
import { JournalEntryCard } from "./JournalEntryCard";

interface Props {
  groups: GroupedEntries[];
  onDelete: (id: Id<"journalEntries">) => void;
  selectedEntryId?: Id<"journalEntries"> | null;
  onSelectEntry?: (id: Id<"journalEntries">) => void;
}

export function JournalEntryList({ groups, onDelete, selectedEntryId, onSelectEntry }: Props) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-slate-300">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No journal entries yet</p>
        <p className="text-sm mt-1">
          Tap the microphone to record your first thought.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
            {group.date}
          </h3>
          <div className="space-y-3">
            {group.entries.map((entry) => (
              <JournalEntryCard
                key={entry._id}
                entry={entry}
                onDelete={onDelete}
                isSelected={selectedEntryId === entry._id}
                onSelect={onSelectEntry}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
