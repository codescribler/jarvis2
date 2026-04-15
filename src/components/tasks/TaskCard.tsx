"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus, Calendar, Check } from "lucide-react";
import { Task } from "@/types/task";
import { Id } from "../../../convex/_generated/dataModel";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskSizeDots } from "./TaskSizeDots";
import { TaskSubtaskList } from "./TaskSubtaskList";

interface Props {
  task: Task;
  allTasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubtask: (parentId: Id<"tasks">) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: Id<"tasks">) => void;
}

export function TaskCard({
  task,
  allTasks,
  onEdit,
  onDelete,
  onAddSubtask,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: Props) {
  const isSelected = selectedIds?.has(task._id) ?? false;
  const [expanded, setExpanded] = useState(false);
  const children = allTasks.filter((t) => t.parentId === task._id);
  const hasChildren = children.length > 0;

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect?.(task._id);
    } else {
      onEdit(task);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm group cursor-pointer transition-all ${
        isSelected
          ? "border-indigo-400 ring-2 ring-indigo-200"
          : "border-slate-100 hover:border-slate-200"
      }`}
      onClick={handleCardClick}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Selection checkbox */}
        {selectionMode && (
          <div
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
              isSelected
                ? "bg-indigo-600 border-indigo-600"
                : "border-slate-300 bg-white"
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={`mt-0.5 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors ${
            hasChildren ? "" : "invisible"
          }`}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-slate-800 ${task.status === "done" ? "line-through text-slate-400" : ""}`}>
              {task.title}
            </span>
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            <TaskSizeDots size={task.size} />
          </div>

          {task.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.dueDate && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {hasChildren && (
              <span className="text-xs text-slate-400">
                {children.length} subtask{children.length !== 1 ? "s" : ""}
              </span>
            )}
            {task.notes && (
              <span className="text-xs text-slate-400">• notes</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!selectionMode && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddSubtask(task._id);
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
              title="Add subtask"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Subtasks */}
      {expanded && hasChildren && (
        <TaskSubtaskList
          parentId={task._id}
          allTasks={allTasks}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubtask={onAddSubtask}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      )}
    </div>
  );
}
