"use client";

import { useState, useCallback, useRef } from "react";
import { AppStatus, ExtractedTask, TranscriptionCallbacks } from "@/types";
import { Id } from "../../convex/_generated/dataModel";
import { connectLiveTranscription, refineText, extractTasks } from "@/services/gemini";
import {
  useGroupedJournalEntries,
  useCreateJournalEntry,
  useDeleteJournalEntry,
} from "@/lib/useJournal";
import { RecordingControls, ConnectionState } from "./RecordingControls";
import { JournalEntryList } from "./JournalEntryList";
import { CommandsPanel } from "./CommandsPanel";
import { AutoTaskModal } from "./AutoTaskModal";
import { PasteTranscriptModal } from "./PasteTranscriptModal";

type Session = Awaited<ReturnType<typeof connectLiveTranscription>>;

const MAX_RECONNECT_ATTEMPTS = 2;

export function JournalApp() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [rawText, setRawText] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("ok");
  const [selectedEntryId, setSelectedEntryId] =
    useState<Id<"journalEntries"> | null>(null);
  const [showAutoTaskModal, setShowAutoTaskModal] = useState(false);
  const [autoTasks, setAutoTasks] = useState<ExtractedTask[] | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);

  const groups = useGroupedJournalEntries() ?? [];
  const createEntry = useCreateJournalEntry();
  const deleteEntryMutation = useDeleteJournalEntry();

  const transcriptionRef = useRef<Session | null>(null);
  const isStoppingRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const currentTranscriptRef = useRef("");

  const persistEntry = useCallback(
    async (finalRawText: string) => {
      if (!finalRawText.trim()) return;
      const refined = await refineText(finalRawText);
      setPolishedText(refined);

      await createEntry({
        rawText: finalRawText,
        polishedText: refined,
        timestamp: Date.now(),
      });

      setShowAutoTaskModal(true);
      setAutoTasks(null);
      extractTasks(refined || finalRawText)
        .then((extracted) => setAutoTasks(extracted))
        .catch((err) => {
          console.error("Auto task extraction failed:", err);
          setShowAutoTaskModal(false);
          setAutoTasks(null);
        });
    },
    [createEntry],
  );

  const finishRecording = useCallback(async () => {
    if (!transcriptionRef.current || isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      setStatus(AppStatus.REFINING);
      const finalRawText = await transcriptionRef.current.stop();
      setRawText(finalRawText);
      currentTranscriptRef.current = finalRawText;

      if (finalRawText.trim()) {
        await persistEntry(finalRawText);
      }

      setStatus(AppStatus.IDLE);
      setConnectionState("ok");
    } catch (err) {
      console.error(err);
      setError("Error while polishing the text.");
      setStatus(AppStatus.ERROR);
    } finally {
      transcriptionRef.current = null;
      isStoppingRef.current = false;
      reconnectCountRef.current = 0;
    }
  }, [persistEntry]);

  const buildCallbacks = useCallback(
    (attemptReconnect: () => Promise<void>): TranscriptionCallbacks => ({
      onTranscription: (text) => {
        currentTranscriptRef.current = text;
        setRawText(text);
      },
      onError: (err) => {
        console.error(err);
        if (!transcriptionRef.current || isStoppingRef.current) {
          setError("An error occurred during transcription.");
          setStatus(AppStatus.ERROR);
          return;
        }
        attemptReconnect();
      },
      onVoiceCommand: () => {
        finishRecording();
      },
    }),
    [finishRecording],
  );

  const openSession = useCallback(
    async (initialTranscript: string): Promise<Session> => {
      // Forward declaration — attemptReconnect references session via closure
      let session: Session | null = null;

      const attemptReconnect = async () => {
        if (
          isStoppingRef.current ||
          reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS
        ) {
          setConnectionState("dropped");
          setError(
            "Session dropped repeatedly. Any captured text was saved.",
          );
          finishRecording();
          return;
        }
        reconnectCountRef.current += 1;
        setConnectionState("reconnecting");
        try {
          const carryOver = currentTranscriptRef.current;
          const newSession = await openSession(carryOver);
          transcriptionRef.current = newSession;
          setConnectionState("ok");
          setError(null);
        } catch (reconnectErr) {
          console.error("Reconnect failed:", reconnectErr);
          setConnectionState("dropped");
          setError("Could not reconnect. Any captured text was saved.");
          finishRecording();
        }
      };

      const callbacks = buildCallbacks(attemptReconnect);
      session = await connectLiveTranscription(callbacks, {
        initialTranscript,
      });
      return session;
    },
    [buildCallbacks, finishRecording],
  );

  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      setRawText("");
      setPolishedText("");
      setConnectionState("ok");
      reconnectCountRef.current = 0;
      currentTranscriptRef.current = "";
      setStatus(AppStatus.RECORDING);

      const session = await openSession("");
      transcriptionRef.current = session;
    } catch (err) {
      console.error(err);
      setError("Could not access microphone or start session.");
      setStatus(AppStatus.IDLE);
    }
  }, [openSession]);

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

  const handlePasteSubmit = useCallback(
    async (text: string) => {
      setStatus(AppStatus.REFINING);
      setError(null);
      setRawText(text);
      try {
        await persistEntry(text);
        setStatus(AppStatus.IDLE);
      } catch (err) {
        console.error(err);
        setStatus(AppStatus.ERROR);
        setError("Failed to polish or save entry.");
        throw err;
      }
    },
    [persistEntry],
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
        connectionState={connectionState}
        onStart={handleStartRecording}
        onStop={handleStopRecording}
        onPaste={() => setShowPasteModal(true)}
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

      {showPasteModal && (
        <PasteTranscriptModal
          onSubmit={handlePasteSubmit}
          onClose={() => setShowPasteModal(false)}
        />
      )}
    </main>
  );
}
