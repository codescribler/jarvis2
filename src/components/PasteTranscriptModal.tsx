"use client";

import { useEffect, useState } from "react";
import { X, Loader2, ClipboardPaste } from "lucide-react";

interface Props {
  onSubmit: (text: string) => Promise<void>;
  onClose: () => void;
}

export function PasteTranscriptModal({ onSubmit, onClose }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, submitting]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save entry. Try again.",
      );
      setSubmitting(false);
    }
  };

  const charCount = text.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <ClipboardPaste className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Paste transcript
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-sm text-slate-500">
            Paste a transcript recorded elsewhere (e.g. iPhone Voice Memos).
            It will be polished and saved as a journal entry, and tasks will
            be auto-extracted.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
            placeholder="Paste your transcript here..."
            className="w-full h-80 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-y disabled:bg-slate-50 disabled:cursor-not-allowed font-mono leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{charCount.toLocaleString()} characters</span>
            {charCount > 50000 && (
              <span className="text-amber-600">
                Long transcript — polishing may take a moment
              </span>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Polishing &amp; saving...
              </>
            ) : (
              "Save entry"
            )}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
