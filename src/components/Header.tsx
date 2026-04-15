"use client";

import { Bot } from "lucide-react";

export function Header() {
  return (
    <header className="w-full max-w-3xl mb-6 flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Jarvis
        </h1>
        <p className="text-xs text-slate-400">Journal Assistant</p>
      </div>
    </header>
  );
}
