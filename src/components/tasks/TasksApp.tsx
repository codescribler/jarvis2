"use client";

import { useState, useCallback, useMemo } from "react";
import { Task, TaskStatus } from "@/types/task";
import { Id } from "../../../convex/_generated/dataModel";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  computeTagCounts,
  getChildrenOf,
} from "@/lib/useTasks";
import { TaskToolbar, ViewMode } from "./TaskToolbar";
import { TaskList } from "./TaskList";
import { TaskBoard } from "./TaskBoard";
import { TaskFormModal } from "./TaskFormModal";
import { TaskSummaryModal } from "./TaskSummaryModal";
import { TaskTagSidebar } from "./TaskTagSidebar";
import { generateTaskSummary } from "@/services/task-summary";

const priorityOrder: Record<string, number> = { urgent: 0, normal: 1, low: 2 };

export function TasksApp() {
  const tasksFromServer = useTasks();
  const tasks = useMemo(() => tasksFromServer ?? [], [tasksFromServer]);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "priority" | "dueDate">("newest");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [subtaskParentId, setSubtaskParentId] = useState<Id<"tasks"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const reload = useCallback(() => {
    /* no-op: reactive query */
  }, []);

  const tagCounts = useMemo(() => computeTagCounts(tasks), [tasks]);

  const rootTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.parentId === null);

    if (viewMode === "list" && statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    if (activeTag) {
      filtered = filtered.filter((t) => t.tags.includes(activeTag));
    }

    filtered.sort((a, b) => {
      if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b._creationTime - a._creationTime;
    });

    return filtered;
  }, [tasks, statusFilter, sortBy, activeTag, viewMode]);

  const handleCreate = useCallback(
    async (task: Task) => {
      await createTaskMutation({
        title: task.title,
        description: task.description,
        priority: task.priority,
        size: task.size,
        status: task.status,
        tags: task.tags,
        dueDate: task.dueDate,
        parentId: task.parentId,
      });
      setShowForm(false);
      setEditingTask(undefined);
      setSubtaskParentId(null);
    },
    [createTaskMutation],
  );

  const handleUpdate = useCallback(
    async (task: Task) => {
      await updateTaskMutation({
        id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        size: task.size,
        status: task.status,
        tags: task.tags,
        dueDate: task.dueDate,
        parentId: task.parentId,
      });
      setShowForm(false);
      setEditingTask(undefined);
      setSubtaskParentId(null);
    },
    [updateTaskMutation],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setSubtaskParentId(null);
    setShowForm(true);
  }, []);

  const handleDeleteRequest = useCallback(
    async (task: Task) => {
      const children = getChildrenOf(tasks, task._id);
      if (children.length > 0) {
        setConfirmDelete(task);
      } else {
        await deleteTaskMutation(task._id);
      }
    },
    [tasks, deleteTaskMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDelete) {
      await deleteTaskMutation(confirmDelete._id);
      setConfirmDelete(null);
    }
  }, [confirmDelete, deleteTaskMutation]);

  const handleAddSubtask = useCallback((parentId: Id<"tasks">) => {
    setEditingTask(undefined);
    setSubtaskParentId(parentId);
    setShowForm(true);
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const result = await generateTaskSummary(tasks);
      setSummaryText(result);
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("task-summary-cache", JSON.stringify({ date: today, text: result }));
    } catch (err) {
      console.error("Failed to generate task summary:", err);
      const message = err instanceof Error && err.message.includes("503")
        ? "Gemini is experiencing high demand. Please try again in a moment."
        : "Failed to generate summary. Please try again.";
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, [tasks]);

  const handleSummary = useCallback(() => {
    setShowSummary(true);
    setSummaryError(null);

    // Check for same-day cache
    try {
      const cached = localStorage.getItem("task-summary-cache");
      if (cached) {
        const { date, text } = JSON.parse(cached);
        const today = new Date().toISOString().split("T")[0];
        if (date === today && text) {
          setSummaryText(text);
          return;
        }
      }
    } catch { /* ignore bad cache */ }

    setSummaryText(null);
    fetchSummary();
  }, [fetchSummary]);

  const handleRefreshSummary = useCallback(() => {
    setSummaryText(null);
    fetchSummary();
  }, [fetchSummary]);

  const handleCloseSummary = useCallback(() => {
    setShowSummary(false);
  }, []);

  const handleNewTask = useCallback(() => {
    setEditingTask(undefined);
    setSubtaskParentId(null);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingTask(undefined);
    setSubtaskParentId(null);
  }, []);

  return (
    <div className={`w-full flex flex-col lg:flex-row gap-6 ${viewMode === "board" ? "max-w-full" : "max-w-6xl"}`}>
      {/* Sidebar */}
      <div className="lg:w-56 shrink-0">
        <TaskTagSidebar
          tagCounts={tagCounts}
          activeTag={activeTag}
          onTagClick={setActiveTag}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        <TaskToolbar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onNewTask={handleNewTask}
          onSummary={handleSummary}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {viewMode === "list" ? (
          <TaskList
            tasks={rootTasks}
            allTasks={tasks}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onAddSubtask={handleAddSubtask}
          />
        ) : (
          <TaskBoard
            tasks={rootTasks}
            allTasks={tasks}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            reload={reload}
          />
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <TaskFormModal
          initial={editingTask}
          parentId={subtaskParentId}
          allTasks={tasks}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onClose={handleCloseForm}
        />
      )}

      {/* Summary modal */}
      {showSummary && (
        <TaskSummaryModal
          summary={summaryText}
          loading={summaryLoading}
          error={summaryError}
          onRefresh={handleRefreshSummary}
          onClose={handleCloseSummary}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">Delete task?</h3>
            <p className="text-sm text-slate-600">
              &ldquo;{confirmDelete.title}&rdquo; has subtasks. Deleting it will also remove all its descendants.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
