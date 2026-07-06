import type { NoteEvent } from "../types";
import { midiToStringIndex, noteNameToMidi } from "./music";

const RIFF_PATTERN = [
  "A2",
  "C3",
  "D3",
  "E3",
  "G3",
  "A3",
  "G3",
  "E3",
  "D3",
  "C3",
  "A2",
  "C3",
  "D3",
  "E3",
  "D3",
  "C3",
];

const NOTE_GAP_SEC = 0.35;
const NOTE_DURATION_SEC = 0.22;
const START_OFFSET_SEC = 2;
const REPEATS = 4;

export function buildDemoRiff(): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let index = 0;

  for (let repeat = 0; repeat < REPEATS; repeat++) {
    for (const noteName of RIFF_PATTERN) {
      const midi = noteNameToMidi(noteName);
      notes.push({
        id: `demo-${index}`,
        midi,
        noteName,
        stringIndex: midiToStringIndex(midi),
        time: START_OFFSET_SEC + index * NOTE_GAP_SEC,
        duration: NOTE_DURATION_SEC,
        hit: false,
        missed: false,
      });
      index++;
    }
  }

  return notes;
}

export const DEMO_SONG_NAME = "Riff Demo - Am Pentatonic";
