import { Id } from "../../convex/_generated/dataModel";

export type TaskPriority = "urgent" | "normal" | "low";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "someday" | "done";
export type TaskSize = 1 | 2 | 3 | 4 | 5;

export interface Task {
  _id: Id<"tasks">;
  _creationTime: number;
  title: string;
  description: string;
  priority: TaskPriority;
  size: TaskSize;
  status: TaskStatus;
  tags: string[];
  dueDate: string | null;
  parentId: Id<"tasks"> | null;
  notes?: string;
  updatedAt: number;
}
