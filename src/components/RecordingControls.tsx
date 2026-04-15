"use client";

import { Mic, Square, Loader2 } from "lucide-react";
import { AppStatus } from "@/types";
import { TranscriptionPanel } from "./TranscriptionPanel";

interface Props {
  status: AppStatus;
  rawText: string;
  polishedText: string;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function RecordingControls({
  status,
  rawText,
  polishedText,
  error,
  onStart,
  onStop,
}: Props) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-xl shadow-indigo-100/50 space-y-4">
      <div className="flex items-center gap-4">
        {/* Mic button */}
        {status === AppStatus.RECORDING ? (
          <button
            onClick={onStop}
            className="relative w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all shadow-lg pulse-ring shrink-0"
          >
            <Square className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={status === AppStatus.REFINING}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg shrink-0 ${
              status === AppStatus.REFINING
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            }`}
          >
            {status === AppStatus.REFINING ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Status text */}
        <div className="min-w-0">
          <p
            className={`font-semibold ${
              status === AppStatus.RECORDING
                ? "text-red-500"
                : status === AppStatus.ERROR
                  ? "text-amber-600"
                  : "text-slate-700"
            }`}
          >
            {status === AppStatus.RECORDING
              ? "Recording..."
              : status === AppStatus.REFINING
                ? "Polishing your words..."
                : status === AppStatus.ERROR
                  ? "Session ended"
                  : "Tap to start speaking"}
          </p>
          <p className="text-xs text-slate-400">
            {status === AppStatus.RECORDING
              ? 'Say "Jarvis stop" or tap to stop'
              : status === AppStatus.IDLE
                ? "Your speech will be transcribed and polished"
                : ""}
          </p>
          {error && (
            <p className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Transcription panel */}
      <TranscriptionPanel
        status={status}
        rawText={rawText}
        polishedText={polishedText}
      />
    </div>
  );
}
