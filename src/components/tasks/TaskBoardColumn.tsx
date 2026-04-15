"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types/task";
import { TaskBoardCard } from "./TaskBoardCard";

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isOver?: boolean;
}

const columnStyles: Record<TaskStatus, { dot: string; bg: string; border: string; label: string }> = {
  todo: { dot: "bg-slate-400", bg: "bg-slate-50", border: "border-slate-200", label: "Todo" },
  in_progress: { dot: "bg-blue-500", bg: "bg-blue-50/50", border: "border-blue-200", label: "In Progress" },
  blocked: { dot: "bg-red-500", bg: "bg-red-50/50", border: "border-red-200", label: "Blocked" },
  someday: { dot: "bg-purple-500", bg: "bg-purple-50/50", border: "border-purple-200", label: "Someday" },
  done: { dot: "bg-green-500", bg: "bg-green-50/50", border: "border-green-200", label: "Done" },
};

export function TaskBoardColumn({ status, tasks, onEdit, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = columnStyles[status];
  const taskIds = tasks.map((t) => t._id);

  return (
    <div
      className={`flex flex-col w-72 shrink-0 rounded-2xl border h-full ${style.border} ${style.bg} transition-all ${
        isOver ? "ring-2 ring-indigo-400 ring-offset-2" : ""
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
        <span className="text-sm font-semibold text-slate-700">{style.label}</span>
        <span className="ml-auto text-xs text-slate-400 font-medium bg-white px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskBoardCard
              key={task._id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-300">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
