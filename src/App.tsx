import { useState } from "react";
import { MidiUpload } from "./components/MidiUpload";
import { NoteHighway } from "./components/NoteHighway";
import { ScorePanel } from "./components/ScorePanel";
import { useGameEngine } from "./hooks/useGameEngine";
import type { NoteEvent, PlaybackSpeed } from "./types";
import { DEMO_SONG_NAME, buildDemoRiff } from "./utils/demoRiff";

function App() {
  const [songName, setSongName] = useState(DEMO_SONG_NAME);
  const [demoNotes] = useState<NoteEvent[]>(() => buildDemoRiff());

  const engine = useGameEngine(demoNotes);

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
        <div className="min-h-[420px] flex-1 md:min-h-0">
          <NoteHighway
            notesRef={engine.notesRef}
            subscribeFrame={engine.subscribeFrame}
            subscribeJudgement={engine.subscribeJudgement}
          />
        </div>

        <aside className="flex w-full flex-col gap-4 md:w-80">
          <ScorePanel
            songName={songName}
            status={engine.status}
            speed={engine.speed}
            stats={engine.stats}
            onPlayPause={handlePlayPause}
            onReset={engine.reset}
            onSpeedChange={handleSpeedChange}
          />
          <MidiUpload onNotesLoaded={handleNotesLoaded} />
        </aside>
      </main>
    </div>
  );
}

export default App;
