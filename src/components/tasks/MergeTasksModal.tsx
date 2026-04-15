"use client";

import { useEffect, useState } from "react";
import { X, GitMerge, Loader2 } from "lucide-react";
import { Task } from "@/types/task";
import { Id } from "../../../convex/_generated/dataModel";

interface Props {
  tasks: Task[];
  onConfirm: (keepId: Id<"tasks">) => Promise<void>;
  onClose: () => void;
}

export function MergeTasksModal({ tasks, onConfirm, onClose }: Props) {
  const [keepId, setKeepId] = useState<Id<"tasks"> | null>(
    tasks[0]?._id ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, submitting]);

  const handleConfirm = async () => {
    if (!keepId) return;
    setSubmitting(true);
    try {
      await onConfirm(keepId);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <GitMerge className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Merge {tasks.length} tasks
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-slate-500">
            Select which task to keep. The other titles will be appended to
            its notes, their tags will be merged in, and any subtasks will be
            reparented to the kept task.
          </p>
          <div className="space-y-2">
            {tasks.map((task) => (
              <label
                key={task._id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  keepId === task._id
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="keep"
                  checked={keepId === task._id}
                  onChange={() => setKeepId(task._id)}
                  disabled={submitting}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  {task.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={submitting || !keepId || tasks.length < 2}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merging...
              </>
            ) : (
              `Merge ${tasks.length - 1} into selected`
            )}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
