import { Id } from "../../convex/_generated/dataModel";

export enum AppStatus {
  IDLE = "IDLE",
  RECORDING = "RECORDING",
  REFINING = "REFINING",
  ERROR = "ERROR",
}

export interface JournalEntry {
  _id: Id<"journalEntries">;
  _creationTime: number;
  timestamp: number;
  rawText: string;
  polishedText: string;
}

export interface ExtractedTask {
  text: string;
  priority?: "high" | "medium" | "low";
  tags: string[];
  duplicateOf?: string;
}

export interface TranscriptionCallbacks {
  onTranscription: (text: string, isFinal: boolean) => void;
  onError: (error: unknown) => void;
  onVoiceCommand: (command: string) => void;
}
