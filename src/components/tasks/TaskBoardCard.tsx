"use client";

import { useSortable } from "@dnd-kit/sortable";
import { Pencil, Trash2, Calendar, Tag } from "lucide-react";
import { Task } from "@/types/task";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskSizeDots } from "./TaskSizeDots";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskBoardCard({ task, onEdit, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX ?? 1}) scaleY(${transform.scaleY ?? 1})`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(task)}
      className={`bg-white rounded-xl border border-slate-100 shadow-sm p-3 cursor-grab active:cursor-grabbing group select-none ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-indigo-300" : "hover:shadow-md"
      } ${task.status === "done" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-sm font-medium text-slate-800 line-clamp-2 ${
            task.status === "done" ? "line-through text-slate-400" : ""
          }`}
        >
          {task.title}
        </span>

        {/* Actions - shown on hover */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <TaskPriorityBadge priority={task.priority} />
        <TaskSizeDots size={task.size} />
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            {task.dueDate}
          </span>
        )}
        {task.tags.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Tag className="w-3 h-3" />
            {task.tags.length}
          </span>
        )}
      </div>
    </div>
  );
}
