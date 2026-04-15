"use client";

import { useEffect, useMemo } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";

function renderMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split("\n")
    .map((line) => {
      // Headings
      if (line.startsWith("### ")) return `<h4 class="font-semibold text-slate-800 mt-3 mb-1">${line.slice(4)}</h4>`;
      if (line.startsWith("## ")) return `<h3 class="font-semibold text-slate-800 text-base mt-4 mb-1">${line.slice(3)}</h3>`;
      if (line.startsWith("# ")) return `<h3 class="font-bold text-slate-900 text-base mt-4 mb-1">${line.slice(2)}</h3>`;
      // Bullet points
      if (/^[-*] /.test(line)) return `<li class="ml-4 list-disc">${line.slice(2)}</li>`;
      // Empty line
      if (line.trim() === "") return "<br/>";
      // Regular paragraph
      return `<p>${line}</p>`;
    })
    .join("")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
}

interface Props {
  summary: string | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

export function TaskSummaryModal({ summary, loading, error, onRefresh, onClose }: Props) {
  const html = useMemo(() => (summary ? renderMarkdown(summary) : ""), [summary]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Task Summary</h2>
          <div className="flex items-center gap-1">
            {!loading && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Refresh summary"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Generating summary...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-slate-600 text-center">{error}</p>
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : (
            <div
              className="text-sm text-slate-700 leading-relaxed space-y-0.5 [&_li]:my-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        <div className="p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
