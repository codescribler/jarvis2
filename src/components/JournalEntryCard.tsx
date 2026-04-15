"use client";

import { Copy, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { JournalEntry } from "@/types";
import { Id } from "../../convex/_generated/dataModel";

interface Props {
  entry: JournalEntry;
  onDelete: (id: Id<"journalEntries">) => void;
  isSelected?: boolean;
  onSelect?: (id: Id<"journalEntries">) => void;
}

export function JournalEntryCard({ entry, onDelete, isSelected, onSelect }: Props) {
  const [copied, setCopied] = useState(false);

  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.polishedText || entry.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(entry._id);
  };

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border group cursor-pointer transition-all ${
        isSelected
          ? "border-indigo-300 ring-2 ring-indigo-100 shadow-md"
          : "border-slate-100 hover:border-slate-200"
      }`}
      onClick={() => onSelect?.(entry._id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-1.5">{time}</p>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {entry.polishedText || entry.rawText}
          </p>
          {entry.polishedText && entry.rawText !== entry.polishedText && (
            <details className="mt-2" onClick={(e) => e.stopPropagation()}>
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-500">
                Show original
              </summary>
              <p className="mt-1 text-sm text-slate-400 italic whitespace-pre-wrap">
                {entry.rawText}
              </p>
            </details>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
