import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { AuthGate } from "./AuthGate";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jarvis - Journal Assistant",
  description:
    "Record your thoughts, get them polished by AI, and save them to your journal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
          <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 md:p-8 flex flex-col items-center">
            <AuthGate>{children}</AuthGate>
            <footer className="mt-auto pt-8 pb-4 text-slate-400 text-xs">
              Powered by Gemini 3 Flash &amp; Live API
            </footer>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
