"use client";

import { useState, useCallback, useRef } from "react";
import { AppStatus, ExtractedTask } from "@/types";
import { Id } from "../../convex/_generated/dataModel";
import { connectLiveTranscription, refineText, extractTasks } from "@/services/gemini";
import {
  useGroupedJournalEntries,
  useCreateJournalEntry,
  useDeleteJournalEntry,
} from "@/lib/useJournal";
import { RecordingControls } from "./RecordingControls";
import { JournalEntryList } from "./JournalEntryList";
import { CommandsPanel } from "./CommandsPanel";
import { AutoTaskModal } from "./AutoTaskModal";

export function JournalApp() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [rawText, setRawText] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] =
    useState<Id<"journalEntries"> | null>(null);
  const [showAutoTaskModal, setShowAutoTaskModal] = useState(false);
  const [autoTasks, setAutoTasks] = useState<ExtractedTask[] | null>(null);

  const groups = useGroupedJournalEntries() ?? [];
  const createEntry = useCreateJournalEntry();
  const deleteEntryMutation = useDeleteJournalEntry();

  const transcriptionRef = useRef<{ stop: () => Promise<string> } | null>(null);
  const isStoppingRef = useRef(false);

  const finishRecording = useCallback(async () => {
    if (!transcriptionRef.current || isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      setStatus(AppStatus.REFINING);
      const finalRawText = await transcriptionRef.current.stop();
      setRawText(finalRawText);

      if (finalRawText.trim()) {
        const refined = await refineText(finalRawText);
        setPolishedText(refined);

        await createEntry({
          rawText: finalRawText,
          polishedText: refined,
          timestamp: Date.now(),
        });

        // Auto-extract tasks
        setShowAutoTaskModal(true);
        setAutoTasks(null); // null = loading
        extractTasks(refined || finalRawText)
          .then((extracted) => setAutoTasks(extracted))
          .catch((err) => {
            console.error("Auto task extraction failed:", err);
            setShowAutoTaskModal(false);
            setAutoTasks(null);
          });
      }

      setStatus(AppStatus.IDLE);
    } catch (err) {
      console.error(err);
      setError("Error while polishing the text.");
      setStatus(AppStatus.ERROR);
    } finally {
      transcriptionRef.current = null;
      isStoppingRef.current = false;
    }
  }, [createEntry]);

  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      setRawText("");
      setPolishedText("");
      setStatus(AppStatus.RECORDING);

      const session = await connectLiveTranscription({
        onTranscription: (text) => {
          setRawText(text);
        },
        onError: (err) => {
          console.error(err);
          // Session dropped (e.g. Gemini timeout) — auto-save what we have
          if (transcriptionRef.current && !isStoppingRef.current) {
            setError("Session ended — your entry was saved automatically.");
            finishRecording();
          } else {
            setError("An error occurred during transcription.");
            setStatus(AppStatus.ERROR);
          }
        },
        onVoiceCommand: () => {
          finishRecording();
        },
      });

      transcriptionRef.current = session;
    } catch (err) {
      console.error(err);
      setError("Could not access microphone or start session.");
      setStatus(AppStatus.IDLE);
    }
  }, [finishRecording]);

  const handleStopRecording = useCallback(() => {
    finishRecording();
  }, [finishRecording]);

  const handleSelectEntry = useCallback((id: Id<"journalEntries">) => {
    setSelectedEntryId((prev) => (prev === id ? null : id));
  }, []);

  const handleDeleteEntry = useCallback(
    async (id: Id<"journalEntries">) => {
      await deleteEntryMutation(id);
      if (selectedEntryId === id) setSelectedEntryId(null);
    },
    [deleteEntryMutation, selectedEntryId],
  );

  const selectedEntry = selectedEntryId
    ? groups.flatMap((g) => g.entries).find((e) => e._id === selectedEntryId) ?? null
    : null;

  return (
    <main
      className={`w-full flex flex-col gap-6 transition-all duration-300 ${
        selectedEntry ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <RecordingControls
        status={status}
        rawText={rawText}
        polishedText={polishedText}
        error={error}
        onStart={handleStartRecording}
        onStop={handleStopRecording}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <JournalEntryList
            groups={groups}
            onDelete={handleDeleteEntry}
            selectedEntryId={selectedEntryId}
            onSelectEntry={handleSelectEntry}
          />
        </div>

        {selectedEntry && (
          <div className="lg:w-80 shrink-0">
            <CommandsPanel key={selectedEntry._id} entry={selectedEntry} />
          </div>
        )}
      </div>

      {showAutoTaskModal && (
        <AutoTaskModal
          tasks={autoTasks}
          onComplete={() => {
            setShowAutoTaskModal(false);
            setAutoTasks(null);
          }}
          onClose={() => {
            setShowAutoTaskModal(false);
            setAutoTasks(null);
          }}
        />
      )}
    </main>
  );
}
