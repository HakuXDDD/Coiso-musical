import { useCallback, useRef, useState } from "react";
import { MicPanel } from "./components/MicPanel";
import { MidiUpload } from "./components/MidiUpload";
import { NoteHighway } from "./components/NoteHighway";
import { ScorePanel } from "./components/ScorePanel";
import { useGameEngine } from "./hooks/useGameEngine";
import { usePitchDetection } from "./hooks/usePitchDetection";
import type { NoteEvent, PitchTolerance, PlaybackSpeed } from "./types";
import { DEMO_SONG_NAME, buildDemoRiff } from "./utils/demoRiff";

function App() {
  const [songName, setSongName] = useState(DEMO_SONG_NAME);
  const [demoNotes] = useState<NoteEvent[]>(() => buildDemoRiff());
  const [tolerance, setTolerance] = useState<PitchTolerance>(0);
  const toleranceRef = useRef<PitchTolerance>(0);

  const engine = useGameEngine(demoNotes);
  const { handleMidiNote } = engine;

  const handleNoteOnset = useCallback(
    (midi: number) => {
      handleMidiNote(midi, toleranceRef.current);
    },
    [handleMidiNote],
  );

  const mic = usePitchDetection(handleNoteOnset);

  function handleToleranceChange(next: PitchTolerance) {
    toleranceRef.current = next;
    setTolerance(next);
  }

  function handleToggleMic() {
    if (mic.active) {
      mic.stop();
    } else {
      void mic.start();
    }
  }

  function handlePlayPause() {
    if (engine.status === "playing") {
      engine.pause();
    } else {
      engine.play();
    }
  }

  function handleSpeedChange(speed: PlaybackSpeed) {
    engine.setSpeed(speed);
  }

  function handleNotesLoaded(notes: NoteEvent[], name: string) {
    engine.loadNotes(notes);
    setSongName(name);
  }

  // Reset zera tudo e volta para o riff demo, mesmo depois de um upload MIDI
  function handleReset() {
    engine.loadNotes(buildDemoRiff());
    setSongName(DEMO_SONG_NAME);
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[#050309] p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-widest text-pink-400 neon-text md:text-4xl">
          FretFlow
        </h1>
        <p className="hidden text-sm text-white/40 md:block">
          Guitar trainer no navegador — sem backend
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-4 md:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <div className="min-h-[420px] flex-1">
            <NoteHighway
              notesRef={engine.notesRef}
              subscribeFrame={engine.subscribeFrame}
              subscribeJudgement={engine.subscribeJudgement}
            />
          </div>
          <p className="rounded-xl bg-white/5 px-3 py-2 text-center text-sm text-white/60">
            Teclado:{" "}
            <span className="font-bold tracking-widest text-cyan-300">
              A S D F G H
            </span>{" "}
            = cordas 1 a 6 — aperte a tecla quando a nota chegar na linha ciano
          </p>
        </div>

        <aside className="flex w-full flex-col gap-4 md:w-80">
          <ScorePanel
            songName={songName}
            status={engine.status}
            speed={engine.speed}
            stats={engine.stats}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
          />
          <MicPanel
            status={mic.status}
            volume={mic.volume}
            frequency={mic.frequency}
            noteName={mic.noteName}
            error={mic.error}
            active={mic.active}
            tolerance={tolerance}
            onToggleMic={handleToggleMic}
            onToleranceChange={handleToleranceChange}
          />
          <MidiUpload onNotesLoaded={handleNotesLoaded} />
        </aside>
      </main>
    </div>
  );
}

export default App;
