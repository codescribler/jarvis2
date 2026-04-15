"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, BookOpen, ListChecks, Settings } from "lucide-react";

const navLinks = [
  { href: "/", label: "Journal", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/settings/api-keys", label: "API Keys", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="w-full max-w-6xl mb-6 flex items-center gap-6">
      <Link href="/" className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Jarvis
          </h1>
          <p className="text-xs text-slate-400">Journal Assistant</p>
        </div>
      </Link>

      <nav className="flex gap-1 ml-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
