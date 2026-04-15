"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { KeyRound, Plus, Trash2, Copy, Check, X, AlertTriangle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function ApiKeysApp() {
  const keys = useQuery(api.apiKeys.list);
  const createKey = useAction(api.apiKeys.create);
  const revokeKey = useMutation(api.apiKeys.revoke);

  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<Id<"apiKeys"> | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";

  const handleCreate = async () => {
    setCreating(true);
    try {
      const raw = await createKey({ label });
      setNewKey(raw);
      setShowCreate(false);
      setLabel("");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRevoke = async (id: Id<"apiKeys">) => {
    await revokeKey({ id });
    setConfirmRevoke(null);
  };

  return (
    <main className="w-full max-w-3xl space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-100/50 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              API Keys
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Generate keys to authorize external systems to pull your data.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New key
          </button>
        </div>

        {siteUrl && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
            <p className="font-semibold text-slate-700">Sync endpoint</p>
            <code className="block text-slate-600 break-all">
              GET {siteUrl}/api/sync?since=&lt;unix-ms&gt;
            </code>
            <p className="text-slate-500 mt-2">
              Header: <code>Authorization: Bearer jv_...</code>
            </p>
            <p className="text-slate-500">
              On first call pass <code>since=0</code>. Store{" "}
              <code>syncedAt</code> from the response and use it as{" "}
              <code>since</code> on the next call.
            </p>
          </div>
        )}

        {/* Key list */}
        <div className="space-y-2">
          {keys === undefined && (
            <p className="text-sm text-slate-400">Loading...</p>
          )}
          {keys && keys.length === 0 && (
            <div className="text-center py-8 text-slate-300">
              <KeyRound className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No API keys yet</p>
            </div>
          )}
          {keys?.map((k) => (
            <div
              key={k._id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{k.label}</p>
                <p className="text-xs text-slate-400">
                  Created {new Date(k._creationTime).toLocaleDateString()}
                  {k.lastUsedAt
                    ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                    : " · Never used"}
                </p>
              </div>
              <button
                onClick={() => setConfirmRevoke(k._id)}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Revoke"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                New API key
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Home server"
                autoFocus
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal-once modal */}
      {newKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Copy your key now
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              This is the only time you&rsquo;ll see this key. Store it somewhere
              safe.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs break-all text-slate-800">
              {newKey}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => setNewKey(null)}
                className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {confirmRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setConfirmRevoke(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">
              Revoke API key?
            </h3>
            <p className="text-sm text-slate-600">
              Any system using this key will immediately lose access. This
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Revoke
              </button>
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-2.5 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
