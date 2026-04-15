"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Task } from "@/types/task";
import { ExtractedTask } from "@/types";

const PRIORITY_MAP: Record<string, Task["priority"]> = {
  high: "urgent",
  medium: "normal",
  low: "low",
};

export type CreateTaskInput = {
  title: string;
  description: string;
  priority: Task["priority"];
  size: Task["size"];
  status: Task["status"];
  tags: string[];
  dueDate: string | null;
  parentId: Id<"tasks"> | null;
  notes?: string;
};

export function extractedToCreateInput(task: ExtractedTask): CreateTaskInput {
  return {
    title: task.text,
    description: "",
    priority: PRIORITY_MAP[task.priority || "medium"] || "normal",
    size: 3,
    status: "todo",
    tags: task.tags,
    dueDate: null,
    parentId: null,
  };
}

export function useTasks(): Task[] | undefined {
  return useQuery(api.tasks.list);
}

export function useCreateTask() {
  return useMutation(api.tasks.create);
}

export function useUpdateTask() {
  return useMutation(api.tasks.update);
}

export function useDeleteTask() {
  const mutate = useMutation(api.tasks.remove);
  return (id: Id<"tasks">) => mutate({ id });
}

export function useMergeTasks() {
  return useMutation(api.tasks.merge);
}

export function computeTagCounts(
  tasks: Task[],
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getChildrenOf(tasks: Task[], parentId: Id<"tasks">): Task[] {
  return tasks.filter((t) => t.parentId === parentId);
}
