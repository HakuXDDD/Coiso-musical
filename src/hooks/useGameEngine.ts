import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GameStats,
  GameStatus,
  JudgementEvent,
  NoteEvent,
  PlaybackSpeed,
} from "../types";
import { GOOD_WINDOW_SEC, PERFECT_WINDOW_SEC, keyToStringIndex } from "../utils/music";

const INITIAL_STATS: GameStats = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  miss: 0,
  accuracy: 100,
};

function computeAccuracy(perfect: number, good: number, miss: number): number {
  const total = perfect + good + miss;
  if (total === 0) return 100;
  return ((perfect + good * 0.5) / total) * 100;
}

export function useGameEngine(initialNotes: NoteEvent[]) {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);

  const notesRef = useRef<NoteEvent[]>(initialNotes);
  const timeRef = useRef(0);
  const statusRef = useRef<GameStatus>("idle");
  const speedRef = useRef<PlaybackSpeed>(1);
  const statsRef = useRef<GameStats>(INITIAL_STATS);
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const frameListeners = useRef(new Set<(time: number) => void>());
  const judgementListeners = useRef(new Set<(event: JudgementEvent) => void>());

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const emitJudgement = useCallback((event: JudgementEvent) => {
    judgementListeners.current.forEach((listener) => listener(event));
  }, []);

  const applyJudgement = useCallback(
    (judgement: "perfect" | "good" | "miss") => {
      const current = statsRef.current;
      let { score, combo, maxCombo, perfect, good, miss } = current;

      if (judgement === "perfect") {
        score += 100;
        combo += 1;
        perfect += 1;
      } else if (judgement === "good") {
        score += 50;
        combo += 1;
        good += 1;
      } else {
        combo = 0;
        miss += 1;
      }

      maxCombo = Math.max(maxCombo, combo);
      const accuracy = computeAccuracy(perfect, good, miss);
      const next: GameStats = { score, combo, maxCombo, perfect, good, miss, accuracy };
      statsRef.current = next;
      setStats(next);
    },
    [],
  );

  const checkMisses = useCallback(() => {
    const now = timeRef.current;
    let anyMissed = false;

    for (const note of notesRef.current) {
      if (note.hit || note.missed) continue;
      if (now > note.time + GOOD_WINDOW_SEC) {
        note.missed = true;
        anyMissed = true;
        applyJudgement("miss");
        emitJudgement({
          stringIndex: note.stringIndex,
          judgement: "miss",
          createdAt: performance.now(),
        });
      }
    }

    return anyMissed;
  }, [applyJudgement, emitJudgement]);

  const notifyFrame = useCallback(() => {
    frameListeners.current.forEach((listener) => listener(timeRef.current));
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const deltaMs = now - lastFrameRef.current;
      lastFrameRef.current = now;

      if (statusRef.current === "playing") {
        timeRef.current += (deltaMs / 1000) * speedRef.current;
        checkMisses();
      }

      notifyFrame();
      rafRef.current = requestAnimationFrame(tick);
    },
    [checkMisses, notifyFrame],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const play = useCallback(() => {
    lastFrameRef.current = null;
    setStatus("playing");
  }, []);

  const pause = useCallback(() => {
    lastFrameRef.current = null;
    setStatus("paused");
  }, []);

  const reset = useCallback(() => {
    timeRef.current = 0;
    lastFrameRef.current = null;
    notesRef.current = notesRef.current.map((note) => ({
      ...note,
      hit: false,
      missed: false,
    }));
    statsRef.current = INITIAL_STATS;
    setStats(INITIAL_STATS);
    setStatus("idle");
  }, []);

  const loadNotes = useCallback((notes: NoteEvent[]) => {
    notesRef.current = notes.map((note) => ({ ...note, hit: false, missed: false }));
    timeRef.current = 0;
    lastFrameRef.current = null;
    statsRef.current = INITIAL_STATS;
    setStats(INITIAL_STATS);
    setStatus("idle");
  }, []);

  const handleKeyString = useCallback(
    (stringIndex: number) => {
      const now = timeRef.current;
      let bestNote: NoteEvent | null = null;
      let bestDiff = Infinity;

      for (const note of notesRef.current) {
        if (note.hit || note.missed) continue;
        if (note.stringIndex !== stringIndex) continue;
        const diff = Math.abs(note.time - now);
        if (diff <= GOOD_WINDOW_SEC && diff < bestDiff) {
          bestDiff = diff;
          bestNote = note;
        }
      }

      if (!bestNote) return;

      bestNote.hit = true;
      const judgement = bestDiff <= PERFECT_WINDOW_SEC ? "perfect" : "good";
      applyJudgement(judgement);
      emitJudgement({
        stringIndex,
        judgement,
        createdAt: performance.now(),
      });
    },
    [applyJudgement, emitJudgement],
  );

  const handleMidiNote = useCallback(
    (midi: number, toleranceSemitones: number) => {
      if (statusRef.current !== "playing") return;
      const now = timeRef.current;
      let bestNote: NoteEvent | null = null;
      let bestTimeDiff = Infinity;
      let bestScore = Infinity;

      for (const note of notesRef.current) {
        if (note.hit || note.missed) continue;
        const timeDiff = Math.abs(note.time - now);
        if (timeDiff > GOOD_WINDOW_SEC) continue;
        const pitchDiff = Math.abs(note.midi - midi);
        if (pitchDiff > toleranceSemitones) continue;
        // prioriza afinação exata e, em empate, a nota mais próxima no tempo
        const score = timeDiff + pitchDiff * 0.1;
        if (score < bestScore) {
          bestScore = score;
          bestTimeDiff = timeDiff;
          bestNote = note;
        }
      }

      if (!bestNote) return;

      bestNote.hit = true;
      const judgement = bestTimeDiff <= PERFECT_WINDOW_SEC ? "perfect" : "good";
      applyJudgement(judgement);
      emitJudgement({
        stringIndex: bestNote.stringIndex,
        judgement,
        createdAt: performance.now(),
      });
    },
    [applyJudgement, emitJudgement],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (statusRef.current !== "playing") return;
      const stringIndex = keyToStringIndex(e.key);
      if (stringIndex === null) return;
      handleKeyString(stringIndex);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyString]);

  const subscribeFrame = useCallback((cb: (time: number) => void) => {
    frameListeners.current.add(cb);
    return () => frameListeners.current.delete(cb);
  }, []);

  const subscribeJudgement = useCallback((cb: (event: JudgementEvent) => void) => {
    judgementListeners.current.add(cb);
    return () => judgementListeners.current.delete(cb);
  }, []);

  const getTime = useCallback(() => timeRef.current, []);

  return {
    status,
    speed,
    stats,
    notesRef,
    getTime,
    play,
    pause,
    reset,
    setSpeed,
    loadNotes,
    handleMidiNote,
    subscribeFrame,
    subscribeJudgement,
  };
}
