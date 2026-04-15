"use client";

import { useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { ExtractedTask } from "@/types";

interface Props {
  tasks: ExtractedTask[];
  onClose: () => void;
  onForceAdd: (task: ExtractedTask) => void;
}

const priorityStyles = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function TaskModal({ tasks, onClose, onForceAdd }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const addedCount = tasks.filter((t) => !t.duplicateOf).length;
  const duplicateCount = tasks.filter((t) => t.duplicateOf).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Extracted Tasks
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tasks.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No tasks found</p>
              <p className="text-sm mt-1">
                This entry doesn&apos;t contain any actionable tasks.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    task.duplicateOf
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  {task.duplicateOf ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 leading-relaxed">
                      {task.text}
                    </p>
                    {task.duplicateOf && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-amber-600">
                          Possible duplicate of &ldquo;{task.duplicateOf}&rdquo;
                        </p>
                        <button
                          onClick={() => onForceAdd(task)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Anyway
                        </button>
                      </div>
                    )}
                    {task.tags.length > 0 && (
                      <div className="mt-1.5 flex gap-1 flex-wrap">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-200/70 text-slate-500 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {task.priority && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${priorityStyles[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 space-y-3">
          {tasks.length > 0 && (
            <p className="text-sm text-slate-500 text-center">
              {addedCount} added{duplicateCount > 0 && `, ${duplicateCount} possible duplicate${duplicateCount > 1 ? "s" : ""}`}
            </p>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
