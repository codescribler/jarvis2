const TRIGGER_PHRASES = [
  "jarvis stop",
  "jarvis, stop",
  "jarvis top",
  "jarvis. stop",
  "jarvisStop",
];

/**
 * Check the tail of a transcription string for a "Jarvis stop" voice command.
 * Returns the matched phrase or null.
 */
export function detectVoiceCommand(text: string): string | null {
  const tail = text.slice(-60).toLowerCase();
  for (const phrase of TRIGGER_PHRASES) {
    if (tail.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

/**
 * Remove the voice command phrase from the end of the transcription text.
 */
export function stripVoiceCommand(text: string): string {
  const lower = text.toLowerCase();
  let result = text;

  for (const phrase of TRIGGER_PHRASES) {
    const idx = lower.lastIndexOf(phrase);
    if (idx !== -1) {
      result = text.slice(0, idx).trimEnd();
      break;
    }
  }

  return result;
}
