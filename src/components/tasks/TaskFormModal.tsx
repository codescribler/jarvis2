"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Task } from "@/types/task";
import { Id } from "../../../convex/_generated/dataModel";
import { TaskForm } from "./TaskForm";

interface Props {
  initial?: Task;
  parentId?: Id<"tasks"> | null;
  allTasks: Task[];
  onCreate: (task: Task) => void | Promise<void>;
  onUpdate: (task: Task) => void | Promise<void>;
  onClose: () => void;
}

export function TaskFormModal({
  initial,
  parentId,
  allTasks,
  onCreate,
  onUpdate,
  onClose,
}: Props) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {initial ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <TaskForm
            initial={initial}
            parentId={parentId}
            allTasks={allTasks}
            onSave={async (task) => {
              if (initial) {
                await onUpdate(task);
              } else {
                await onCreate(task);
              }
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
