import { Midi } from "@tonejs/midi";
import { useCallback, useState } from "react";
import type { NoteEvent } from "../types";
import { midiToNoteName, midiToStringIndex } from "../utils/music";

export function useMidiParser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseMidiFile = useCallback(
    async (file: File): Promise<NoteEvent[]> => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        const rawNotes = midi.tracks.flatMap((track) => track.notes);
        rawNotes.sort((a, b) => a.time - b.time);

        if (rawNotes.length === 0) {
          throw new Error("Nenhuma nota encontrada nesse arquivo MIDI.");
        }

        const notes: NoteEvent[] = rawNotes.map((note, index) => ({
          id: `midi-${index}-${note.midi}-${note.time.toFixed(3)}`,
          midi: note.midi,
          noteName: midiToNoteName(note.midi),
          stringIndex: midiToStringIndex(note.midi),
          time: note.time,
          duration: Math.max(note.duration, 0.1),
          hit: false,
          missed: false,
        }));

        return notes;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha ao ler o arquivo MIDI.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { parseMidiFile, loading, error };
}
