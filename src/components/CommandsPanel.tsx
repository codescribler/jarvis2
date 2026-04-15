"use client";

import { useState } from "react";
import { ListTodo, Loader2 } from "lucide-react";
import { JournalEntry, ExtractedTask } from "@/types";
import { extractTasks, checkDuplicateTasks } from "@/services/gemini";
import { useTasks, useCreateTask, extractedToCreateInput } from "@/lib/useTasks";
import { TaskModal } from "./TaskModal";

interface Props {
  entry: JournalEntry;
}

export function CommandsPanel({ entry }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[] | null>(null);
  const allTasks = useTasks() ?? [];
  const createTask = useCreateTask();

  const handleExtractTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const text = entry.polishedText || entry.rawText;
      const extracted = await extractTasks(text);
      if (extracted.length === 0) {
        setTasks(extracted);
        return;
      }

      // Duplicate detection: pre-filter by tag overlap
      const existingTasks = allTasks.filter((t) => t.status !== "done");

      // For each extracted task, find existing tasks that share at least 1 tag
      const needsCheck: { index: number; text: string }[] = [];
      const candidateExisting = new Map<string, { title: string }>();

      for (let i = 0; i < extracted.length; i++) {
        const extractedTags = new Set(extracted[i].tags);
        let hasOverlap = false;
        for (const existing of existingTasks) {
          if (existing.tags.some((tag) => extractedTags.has(tag))) {
            hasOverlap = true;
            candidateExisting.set(existing._id, { title: existing.title });
          }
        }
        if (hasOverlap) {
          needsCheck.push({ index: i, text: extracted[i].text });
        }
      }

      // Semantic duplicate check (only if there are tag-overlapping candidates)
      let duplicateMap: Record<number, string> = {};
      if (needsCheck.length > 0) {
        duplicateMap = await checkDuplicateTasks(
          needsCheck,
          Array.from(candidateExisting.values())
        );
      }

      // Mark duplicates and auto-add non-duplicates
      const results: ExtractedTask[] = [];
      for (let i = 0; i < extracted.length; i++) {
        const task = extracted[i];
        if (duplicateMap[i]) {
          results.push({ ...task, duplicateOf: duplicateMap[i] });
        } else {
          await createTask(extractedToCreateInput(task));
          results.push(task);
        }
      }

      setTasks(results);
    } catch (err) {
      console.error(err);
      setError("Failed to extract tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceAdd = async (task: ExtractedTask) => {
    await createTask(extractedToCreateInput(task));

    // Update state: remove duplicateOf flag
    setTasks((prev) =>
      prev
        ? prev.map((t) =>
            t === task ? { ...t, duplicateOf: undefined } : t
          )
        : prev
    );
  };

  const snippet = (entry.polishedText || entry.rawText).slice(0, 120);

  return (
    <>
      <div className="sticky top-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          Commands
        </h3>

        <button
          onClick={handleExtractTasks}
          disabled={loading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          ) : (
            <ListTodo className="w-5 h-5 shrink-0" />
          )}
          <span className="font-medium text-sm">Look for Tasks</span>
        </button>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Selected entry</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {snippet}
            {(entry.polishedText || entry.rawText).length > 120 && "..."}
          </p>
        </div>
      </div>

      {tasks !== null && (
        <TaskModal
          tasks={tasks}
          onClose={() => setTasks(null)}
          onForceAdd={handleForceAdd}
        />
      )}
    </>
  );
}
