import { useRef } from "react";
import { useMidiParser } from "../hooks/useMidiParser";
import type { NoteEvent } from "../types";

interface MidiUploadProps {
  onNotesLoaded: (notes: NoteEvent[], songName: string) => void;
}

export function MidiUpload({ onNotesLoaded }: MidiUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { parseMidiFile, loading, error } = useMidiParser();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const notes = await parseMidiFile(file);
      const songName = file.name.replace(/\.(mid|midi)$/i, "");
      onNotesLoaded(notes, songName);
    } catch {
      // erro exposto via `error` do hook
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl neon-border bg-[#0c0818] p-4">
      <input
        ref={inputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="btn-neon rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 py-3 text-base font-bold text-black disabled:opacity-50"
      >
        {loading ? "Carregando..." : "Upload MIDI"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
