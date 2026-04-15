"use client";

import { TaskPriority } from "@/types/task";

const styles: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  normal: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[priority]}`}>
      {priority}
    </span>
  );
}
