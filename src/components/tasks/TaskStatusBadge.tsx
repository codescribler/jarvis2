"use client";

import { TaskStatus } from "@/types/task";

const styles: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  someday: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

const labels: Record<TaskStatus, string> = {
  todo: "todo",
  in_progress: "in progress",
  blocked: "blocked",
  someday: "someday",
  done: "done",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
