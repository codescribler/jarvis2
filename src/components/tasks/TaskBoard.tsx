"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CloudMoon } from "lucide-react";
import { Task, TaskStatus } from "@/types/task";
import { useUpdateTask } from "@/lib/useTasks";
import { TaskBoardColumn } from "./TaskBoardColumn";
import { TaskBoardCard } from "./TaskBoardCard";

interface Props {
  tasks: Task[];
  allTasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  reload: () => void;
}

const defaultStatuses: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const allStatuses: TaskStatus[] = ["todo", "in_progress", "blocked", "someday", "done"];

export function TaskBoard({ tasks, allTasks, onEdit, onDelete, reload }: Props) {
  void allTasks;
  void reload;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showSomeday, setShowSomeday] = useState(false);
  const updateTask = useUpdateTask();

  const visibleStatuses = showSomeday ? allStatuses : defaultStatuses;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      someday: [],
      done: [],
    };
    for (const task of tasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t._id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    // The "over" target is either a column (status string) or another card
    let targetStatus: TaskStatus | undefined;

    // Check if dropped over a column directly
    if (allStatuses.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus;
    } else {
      // Dropped over another card — find which column that card is in
      const overTask = tasks.find((t) => t._id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== task.status) {
      await updateTask({ id: task._id, status: targetStatus });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: "calc(100vh - 240px)" }}>
        {visibleStatuses.map((status) => (
          <TaskBoardColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <button
        onClick={() => setShowSomeday(!showSomeday)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
          showSomeday
            ? "bg-purple-100 text-purple-700"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        }`}
      >
        <CloudMoon className="w-3.5 h-3.5" />
        Someday
        {tasksByStatus.someday.length > 0 && (
          <span className="bg-white/70 px-1.5 rounded-full">{tasksByStatus.someday.length}</span>
        )}
      </button>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rotate-2">
            <TaskBoardCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
