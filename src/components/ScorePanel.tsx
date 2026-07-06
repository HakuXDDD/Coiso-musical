import type { GameStats, GameStatus, PlaybackSpeed } from "../types";

interface ScorePanelProps {
  songName: string;
  status: GameStatus;
  speed: PlaybackSpeed;
  stats: GameStats;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 0.75, 1];

function StatBlock({ label, value, colorClass }: { label: string; value: string | number; colorClass: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/5 px-3 py-2">
      <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
    </div>
  );
}

export function ScorePanel({
  songName,
  status,
  speed,
  stats,
  onPlayPause,
  onReset,
  onSpeedChange,
}: ScorePanelProps) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl neon-border bg-[#0c0818] p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-white/40">Musica atual</p>
        <p className="truncate text-lg font-semibold text-cyan-300 neon-text">{songName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col items-center rounded-xl bg-white/5 px-3 py-3">
          <span className="text-4xl font-extrabold text-pink-400 neon-text">{stats.score}</span>
          <span className="text-xs uppercase tracking-wide text-white/50">Score</span>
        </div>
        <StatBlock label="Combo" value={`${stats.combo}x`} colorClass="text-purple-300" />
        <StatBlock label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} colorClass="text-cyan-300" />
        <StatBlock label="Perfect" value={stats.perfect} colorClass="text-emerald-300" />
        <StatBlock label="Good" value={stats.good} colorClass="text-amber-300" />
        <StatBlock label="Miss" value={stats.miss} colorClass="text-red-400" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPlayPause}
            className="btn-neon flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-lg font-bold text-white shadow-lg shadow-pink-500/30"
          >
            {status === "playing" ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="btn-neon rounded-xl bg-white/10 px-4 py-3 text-lg font-bold text-white/80 hover:bg-white/15"
          >
            Reset
          </button>
        </div>

        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Velocidade</p>
          <div className="flex gap-2">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSpeedChange(option)}
                className={`btn-neon flex-1 rounded-lg py-2 text-sm font-semibold ${
                  speed === option
                    ? "bg-cyan-400 text-black shadow-md shadow-cyan-400/50"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {Math.round(option * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
