import { GoogleGenAI } from "@google/genai";
import { Task } from "@/types/task";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const generateTaskSummary = async (tasks: Task[]): Promise<string> => {
  const activeTasks = tasks.filter((t) =>
    t.status === "todo" || t.status === "in_progress" || t.status === "blocked"
  );

  if (activeTasks.length === 0) {
    return "No active tasks! You're all caught up.";
  }

  const today = new Date().toISOString().split("T")[0];
  const taskList = activeTasks
    .map((t) => {
      const parts = [`- "${t.title}"`, `status: ${t.status}`, `priority: ${t.priority}`];
      if (t.dueDate) parts.push(`due: ${t.dueDate}`);
      if (t.tags.length > 0) parts.push(`tags: ${t.tags.join(", ")}`);
      return parts.join(" | ");
    })
    .join("\n");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a productivity assistant. Given the user's current tasks, produce a concise actionable briefing. Today's date is ${today}.

Rules:
- Focus on what needs attention NOW: urgent items, overdue tasks, tasks due soon, and blocked items
- Group by urgency: overdue/urgent first, then due soon, then in-progress, then the rest
- Use plain text with line breaks. Use ** for bold on key items. Use short bullet points.
- Keep it under 20 lines. Be direct and actionable.
- If tasks are overdue, call that out clearly
- Don't just list tasks — add brief context about what to prioritize and why

TASKS:
${taskList}`,
    config: {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
    },
  });
  return response.text || "Unable to generate summary.";
};
