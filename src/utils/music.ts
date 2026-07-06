export const STRING_KEYS = ["A", "S", "D", "F", "G", "H"] as const;

export const STRING_COLORS = [
  "#ff2fd6",
  "#2ff2ff",
  "#9b30ff",
  "#39ff6a",
  "#ffae00",
  "#3b82f6",
];

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export function noteNameToMidi(noteName: string): number {
  const match = /^([A-G]#?)(-?\d+)$/.exec(noteName);
  if (!match) return 57;
  const [, name, octaveStr] = match;
  const index = NOTE_NAMES.indexOf(name);
  const octave = parseInt(octaveStr, 10);
  return index + (octave + 1) * 12;
}

const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];
const MAX_FRET = 15;

export function midiToStringIndex(midi: number): number {
  let bestString = 0;
  let bestFret = Infinity;

  OPEN_STRING_MIDI.forEach((openMidi, index) => {
    const fret = midi - openMidi;
    if (fret >= 0 && fret <= MAX_FRET && fret < bestFret) {
      bestFret = fret;
      bestString = index;
    }
  });

  if (bestFret === Infinity) {
    return midi < OPEN_STRING_MIDI[0] ? 0 : 5;
  }

  return bestString;
}

export function keyToStringIndex(key: string): number | null {
  const index = STRING_KEYS.indexOf(
    key.toUpperCase() as (typeof STRING_KEYS)[number],
  );
  return index === -1 ? null : index;
}

export const PERFECT_WINDOW_SEC = 0.08;
export const GOOD_WINDOW_SEC = 0.18;
