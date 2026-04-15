"use client";

import { Mic, Square, Loader2, ClipboardPaste, AlertTriangle, Wifi } from "lucide-react";
import { AppStatus } from "@/types";
import { TranscriptionPanel } from "./TranscriptionPanel";

export type ConnectionState = "ok" | "reconnecting" | "dropped";

interface Props {
  status: AppStatus;
  rawText: string;
  polishedText: string;
  error: string | null;
  connectionState: ConnectionState;
  onStart: () => void;
  onStop: () => void;
  onPaste: () => void;
}

export function RecordingControls({
  status,
  rawText,
  polishedText,
  error,
  connectionState,
  onStart,
  onStop,
  onPaste,
}: Props) {
  const showReconnecting = connectionState === "reconnecting";
  const showDropped = connectionState === "dropped";

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
        <div className="min-w-0 flex-1">
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
        </div>

        {/* Paste button (visible when not recording/refining) */}
        {status !== AppStatus.RECORDING && status !== AppStatus.REFINING && (
          <button
            onClick={onPaste}
            className="flex items-center gap-2 px-4 py-2.5 text-indigo-700 bg-indigo-50 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors shrink-0"
            title="Paste a transcript recorded elsewhere"
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste transcript
          </button>
        )}
      </div>

      {/* Reconnecting banner */}
      {showReconnecting && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Wifi className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Connection dropped — reconnecting...
            </p>
            <p className="text-xs text-amber-700">
              Your transcript so far is safe. Keep speaking.
            </p>
          </div>
        </div>
      )}

      {/* Dropped / error banner */}
      {showDropped && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">
              Recording session ended
            </p>
            <p className="text-xs text-red-700">
              {error ||
                "The live session was interrupted. Any captured text was saved. Tap the mic to continue."}
            </p>
          </div>
        </div>
      )}

      {/* Inline error (non-dropped) */}
      {error && !showDropped && !showReconnecting && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Transcription panel */}
      <TranscriptionPanel
        status={status}
        rawText={rawText}
        polishedText={polishedText}
      />
    </div>
  );
}
