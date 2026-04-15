"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, Pause, CheckCircle2, Trash2 } from "lucide-react";
import { ExtractedTask } from "@/types";
import { useCreateTask, extractedToCreateInput } from "@/lib/useTasks";

const priorityStyles = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

interface Props {
  tasks: ExtractedTask[] | null; // null = still loading
  onComplete: (tasks: ExtractedTask[]) => void;
  onClose: () => void;
}

export function AutoTaskModal({ tasks, onComplete, onClose }: Props) {
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [editableTasks, setEditableTasks] = useState<ExtractedTask[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitialized = useRef(false);
  const createTask = useCreateTask();

  // Initialize editable tasks when extraction completes
  useEffect(() => {
    if (tasks && !hasInitialized.current) {
      hasInitialized.current = true;
      setEditableTasks([...tasks]);
    }
  }, [tasks]);

  const addAllAndClose = useCallback(
    async (tasksToAdd: ExtractedTask[]) => {
      for (const task of tasksToAdd) {
        await createTask(extractedToCreateInput(task));
      }
      onComplete(tasksToAdd);
    },
    [createTask, onComplete]
  );

  // Auto-close empty state after 2s
  useEffect(() => {
    if (tasks && tasks.length === 0) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [tasks, onClose]);

  // Countdown timer
  useEffect(() => {
    if (!tasks || tasks.length === 0 || paused) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tasks, paused]);

  // Auto-add when countdown hits 0
  useEffect(() => {
    if (countdown === 0 && !paused && editableTasks.length > 0) {
      addAllAndClose(editableTasks);
    }
  }, [countdown, paused, editableTasks, addAllAndClose]);

  // Escape key
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

  const handlePause = () => {
    setPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleDeleteTask = (index: number) => {
    setEditableTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTitle = (index: number, newText: string) => {
    setEditableTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, text: newText } : t))
    );
  };

  const handleComplete = () => {
    addAllAndClose(editableTasks);
  };

  // Loading phase
  if (tasks === null) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-10 text-center animate-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Looking for tasks...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-10 text-center animate-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No tasks found</p>
          <p className="text-sm text-slate-400 mt-1">Closing automatically...</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Countdown / Paused phase
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {paused ? "Review Tasks" : "Adding Tasks..."}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-5">
          <ul className="space-y-3">
            {editableTasks.map((task, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <div className="flex-1 min-w-0">
                  {paused ? (
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => handleEditTitle(i, e.target.value)}
                      className="w-full text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  ) : (
                    <p className="text-slate-700 leading-relaxed">{task.text}</p>
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
                <div className="flex items-center gap-2 shrink-0">
                  {task.priority && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  )}
                  {paused && (
                    <button
                      onClick={() => handleDeleteTask(i)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {paused && editableTasks.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="font-medium">All tasks removed</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center gap-3">
          {paused ? (
            <button
              onClick={handleComplete}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              {editableTasks.length > 0
                ? `Add ${editableTasks.length} Task${editableTasks.length > 1 ? "s" : ""}`
                : "Close"}
            </button>
          ) : (
            <>
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-indigo-600 tabular-nums">
                  {countdown}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adding {editableTasks.length} task{editableTasks.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-slate-500 rounded-xl font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
