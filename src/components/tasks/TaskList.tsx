"use client";

import { ListChecks } from "lucide-react";
import { Task } from "@/types/task";
import { Id } from "../../../convex/_generated/dataModel";
import { TaskCard } from "./TaskCard";

interface Props {
  tasks: Task[];
  allTasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubtask: (parentId: Id<"tasks">) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: Id<"tasks">) => void;
}

export function TaskList({
  tasks,
  allTasks,
  onEdit,
  onDelete,
  onAddSubtask,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-300">
        <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No tasks yet</p>
        <p className="text-sm mt-1">Create your first task to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
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
