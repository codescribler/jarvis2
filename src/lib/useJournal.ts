"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { JournalEntry } from "@/types";

export interface GroupedEntries {
  date: string;
  entries: JournalEntry[];
}

export function useJournalEntries(): JournalEntry[] | undefined {
  return useQuery(api.journal.list);
}

export function useGroupedJournalEntries(): GroupedEntries[] | undefined {
  const entries = useJournalEntries();
  if (entries === undefined) return undefined;

  const groups = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(entry);
  }
  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    entries,
  }));
}

export function useCreateJournalEntry() {
  return useMutation(api.journal.create);
}

export function useDeleteJournalEntry() {
  const mutate = useMutation(api.journal.remove);
  return (id: Id<"journalEntries">) => mutate({ id });
}
