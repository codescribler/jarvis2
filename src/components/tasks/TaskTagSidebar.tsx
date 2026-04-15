"use client";

import { Tag } from "lucide-react";

interface Props {
  tagCounts: { tag: string; count: number }[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

export function TaskTagSidebar({ tagCounts, activeTag, onTagClick }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
        <Tag className="w-3.5 h-3.5" />
        Tags
      </h3>

      <div className="space-y-1">
        <button
          onClick={() => onTagClick(null)}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeTag === null
              ? "bg-indigo-100 text-indigo-700 font-medium"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </button>

        {tagCounts.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
              activeTag === tag
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{tag}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTag === tag ? "bg-indigo-200 text-indigo-700" : "bg-slate-100 text-slate-400"
            }`}>
              {count}
            </span>
          </button>
        ))}

        {tagCounts.length === 0 && (
          <p className="text-xs text-slate-300 px-3 py-2">No tags yet</p>
        )}
      </div>
    </div>
  );
}
