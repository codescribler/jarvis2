"use client";

import { Task } from "@/types/task";
import { Id } from "../../../convex/_generated/dataModel";
import { TaskCard } from "./TaskCard";

interface Props {
  parentId: Id<"tasks">;
  allTasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubtask: (parentId: Id<"tasks">) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: Id<"tasks">) => void;
}

export function TaskSubtaskList({
  parentId,
  allTasks,
  onEdit,
  onDelete,
  onAddSubtask,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: Props) {
  const children = allTasks.filter((t) => t.parentId === parentId);

  if (children.length === 0) return null;

  return (
    <div className="ml-6 border-l-2 border-slate-100 pl-4 pb-4 space-y-3">
      {children.map((child) => (
        <TaskCard
          key={child._id}
          task={child}
          allTasks={allTasks}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubtask={onAddSubtask}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
