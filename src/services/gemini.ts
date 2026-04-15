import { GoogleGenAI, Modality } from "@google/genai";
import { createPcmBlob } from "@/utils/audio";
import { detectVoiceCommand, stripVoiceCommand } from "@/lib/voice-commands";
import { TranscriptionCallbacks, ExtractedTask } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const refineText = async (rawText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a journal entry editor. Clean up and professionalize the following transcribed journal entry. Maintain the original meaning and personal voice, but fix grammar, remove filler words like 'um' and 'uh', and make it flow naturally. Keep it in first person. If the text is empty, return an empty string.

TEXT:
${rawText}`,
    config: {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
    },
  });
  return response.text || "";
};

export const extractTasks = async (
  text: string
): Promise<ExtractedTask[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a task extraction assistant. Analyze the following journal entry and extract any actionable tasks, to-dos, or commitments mentioned. Return a JSON array of objects with:
- "text": the task description
- "priority": "high", "medium", or "low"
- "tags": an array of 1-5 short lowercase keyword tags that categorize this task (e.g. ["shopping", "groceries"], ["work", "email"], ["health", "appointment"])

If there are no tasks, return an empty array [].

Return ONLY the JSON array, no other text.

JOURNAL ENTRY:
${text}`,
    config: {
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
    },
  });
  const raw = (response.text || "").trim();
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    return parsed.map((t: { text: string; priority?: string; tags?: string[] }) => ({
      text: t.text,
      priority: t.priority as ExtractedTask["priority"],
      tags: Array.isArray(t.tags) ? t.tags.map((tag: string) => tag.trim().toLowerCase()).filter(Boolean) : [],
    }));
  } catch {
    console.error("Failed to parse tasks JSON:", raw);
    return [];
  }
};

export const checkDuplicateTasks = async (
  extractedTasks: { index: number; text: string }[],
  existingTasks: { title: string }[]
): Promise<Record<number, string>> => {
  if (extractedTasks.length === 0 || existingTasks.length === 0) return {};

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a duplicate task detector. Given a list of NEW tasks and EXISTING tasks, identify which new tasks are clearly duplicates of existing ones.

Only flag a task as a duplicate if you are very confident it refers to the same action/goal, even if the wording is different. For example, "Buy groceries" and "Get food from the store" are duplicates. But "Call dentist" and "Call plumber" are NOT duplicates.

Be CONSERVATIVE — when in doubt, do NOT flag as duplicate. It is much better to miss a duplicate than to incorrectly flag a unique task.

NEW TASKS:
${extractedTasks.map((t) => `[${t.index}] ${t.text}`).join("\n")}

EXISTING TASKS:
${existingTasks.map((t) => `- ${t.title}`).join("\n")}

Return a JSON object mapping the index of each duplicate new task to the title of the existing task it duplicates. If there are no duplicates, return {}.

Return ONLY the JSON object, no other text.`,
    config: {
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
    },
  });
  const raw = (response.text || "").trim();
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    const result: Record<number, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[parseInt(key)] = value as string;
    }
    return result;
  } catch {
    console.error("Failed to parse duplicates JSON:", raw);
    return {};
  }
};

export const connectLiveTranscription = async (
  callbacks: TranscriptionCallbacks,
  options: { initialTranscript?: string } = {}
) => {
  if (!API_KEY || API_KEY === "PLACEHOLDER_API_KEY") {
    throw new Error(
      "NEXT_PUBLIC_GEMINI_API_KEY is not set. Add your real Gemini API key to .env.local and restart the dev server."
    );
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const inputAudioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)({ sampleRate: 16000 });
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  let currentInputTranscription = options.initialTranscript ?? "";
  if (currentInputTranscription && !currentInputTranscription.endsWith(" ")) {
    currentInputTranscription += " ";
  }

  // Closure-scoped cleanup instead of window global
  let audioCleanup: (() => void) | null = null;

  let sessionClosed = false;
  let intentionalClose = false;

  // Await the session so connection errors propagate to the caller
  const session = await ai.live.connect({
    model: "gemini-live-2.5-flash-preview",
    callbacks: {
      onopen: () => {
        console.log("[Jarvis] Live session opened, starting audio capture");
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(
          4096,
          1,
          1
        );

        scriptProcessor.onaudioprocess = (event) => {
          if (sessionClosed) return;
          const inputData = event.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          session.sendRealtimeInput({ media: pcmBlob });
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);

        audioCleanup = () => {
          source.disconnect();
          scriptProcessor.disconnect();
          stream.getTracks().forEach((track) => track.stop());
          inputAudioContext.close();
        };
      },
      onmessage: (message) => {
        console.log("[Jarvis] Message:", JSON.stringify(message).slice(0, 200));

        if (message.serverContent?.inputTranscription) {
          const text = message.serverContent.inputTranscription.text;
          if (text) {
            currentInputTranscription += text;
            callbacks.onTranscription(currentInputTranscription, false);

            // Check for voice command
            const command = detectVoiceCommand(currentInputTranscription);
            if (command) {
              currentInputTranscription = stripVoiceCommand(
                currentInputTranscription
              );
              callbacks.onTranscription(currentInputTranscription, false);
              callbacks.onVoiceCommand(command);
            }
          }
        }

        if (message.serverContent?.turnComplete) {
          callbacks.onTranscription(currentInputTranscription, true);
        }
      },
      onerror: (e) => {
        console.error("[Jarvis] Live session error:", e);
        callbacks.onError(e);
      },
      onclose: (e: unknown) => {
        const closeInfo = e as { code?: number; reason?: string } | undefined;
        console.log(
          "[Jarvis] Live session closed — code:",
          closeInfo?.code,
          "reason:",
          closeInfo?.reason,
          "raw:",
          e,
        );
        sessionClosed = true;
        if (!intentionalClose) {
          const reason = closeInfo?.reason || "unknown";
          const code = closeInfo?.code ?? "n/a";
          callbacks.onError(
            `Live session closed (code ${code}): ${reason}`,
          );
        }
      },
    },
    config: {
      responseModalities: [Modality.TEXT],
      systemInstruction:
        "Listen to the user. Do not speak or respond. Just listen silently.",
      inputAudioTranscription: {},
    },
  });

  return {
    stop: async () => {
      intentionalClose = true;
      if (audioCleanup) {
        audioCleanup();
        audioCleanup = null;
      }
      session.close();
      return currentInputTranscription;
    },
  };
};
