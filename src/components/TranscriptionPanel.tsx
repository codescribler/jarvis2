"use client";

import { AppStatus } from "@/types";

interface Props {
  status: AppStatus;
  rawText: string;
  polishedText: string;
}

export function TranscriptionPanel({ status, rawText, polishedText }: Props) {
  if (status === AppStatus.IDLE && !rawText && !polishedText) return null;

  return (
    <div className="space-y-3">
      {/* Live transcription */}
      {(status === AppStatus.RECORDING || rawText) && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            {status === AppStatus.RECORDING ? "Listening..." : "Transcribed"}
          </p>
          <div className="max-h-40 overflow-y-auto custom-scrollbar">
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">
              {rawText || (
                <span className="italic text-slate-300">
                  Speech will appear here...
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Polishing indicator */}
      {status === AppStatus.REFINING && (
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
          <p className="text-sm text-indigo-600 font-medium">
            Polishing your words...
          </p>
        </div>
      )}

      {/* Polished result preview */}
      {polishedText && status === AppStatus.IDLE && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2">
            Polished & Saved
          </p>
          <p className="leading-relaxed text-sm">{polishedText}</p>
        </div>
      )}
    </div>
  );
}
