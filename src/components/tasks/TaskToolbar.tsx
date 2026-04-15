"use client";

import { Plus, List, Columns3, Sparkles } from "lucide-react";
import { TaskStatus } from "@/types/task";

export type ViewMode = "list" | "board";

interface Props {
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (status: TaskStatus | "all") => void;
  sortBy: "newest" | "priority" | "dueDate";
  onSortChange: (sort: "newest" | "priority" | "dueDate") => void;
  onNewTask: () => void;
  onSummary: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const statusOptions: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "someday", label: "Someday" },
  { value: "done", label: "Done" },
];

export function TaskToolbar({ statusFilter, onStatusFilterChange, sortBy, onSortChange, onNewTask, onSummary, viewMode, onViewModeChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* View toggle */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-2 transition-colors ${
            viewMode === "list"
              ? "bg-indigo-50 text-indigo-600"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          }`}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange("board")}
          className={`p-2 transition-colors ${
            viewMode === "board"
              ? "bg-indigo-50 text-indigo-600"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          }`}
          title="Board view"
        >
          <Columns3 className="w-4 h-4" />
        </button>
      </div>

      {/* Status filter - hidden in board mode since columns show all statuses */}
      {viewMode === "list" && (
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as TaskStatus | "all")}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as "newest" | "priority" | "dueDate")}
        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
      >
        <option value="newest">Newest First</option>
        <option value="priority">Priority</option>
        <option value="dueDate">Due Date</option>
      </select>

      <button
        onClick={onSummary}
        className="ml-auto flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Summary
      </button>

      <button
        onClick={onNewTask}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Task
      </button>
    </div>
  );
}
