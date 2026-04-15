"use client";

import { TaskSize } from "@/types/task";

export function TaskSizeDots({ size }: { size: TaskSize }) {
  return (
    <div className="flex gap-1 items-center" title={`Size: ${size}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= size ? "bg-indigo-500" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
