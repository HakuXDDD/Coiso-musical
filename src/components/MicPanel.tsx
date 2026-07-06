import type { MicStatus } from "../hooks/usePitchDetection";
import type { PitchTolerance } from "../types";

interface MicPanelProps {
  status: MicStatus;
  volume: number;
  frequency: number | null;
  noteName: string | null;
  error: string | null;
  active: boolean;
  tolerance: PitchTolerance;
  onToggleMic: () => void;
  onToleranceChange: (tolerance: PitchTolerance) => void;
}

const STATUS_INFO: Record<MicStatus, { label: string; dotClass: string }> = {
  off: { label: "Mic desligado", dotClass: "bg-white/30" },
  listening: { label: "Escutando...", dotClass: "bg-cyan-400 animate-pulse" },
  "no-signal": { label: "Sem sinal", dotClass: "bg-amber-400" },
  detecting: { label: "Detectando", dotClass: "bg-emerald-400" },
};

export function MicPanel({
  status,
  volume,
  frequency,
  noteName,
  error,
  active,
  tolerance,
  onToggleMic,
  onToleranceChange,
}: MicPanelProps) {
  const info = STATUS_INFO[status];
  const volumePercent = Math.min(100, Math.round(volume * 400));

  return (
    <div className="flex flex-col gap-3 rounded-2xl neon-border bg-[#0c0818] p-4">
      <button
        type="button"
        onClick={onToggleMic}
        className={`btn-neon rounded-xl py-3 text-base font-bold ${
          active
            ? "bg-white/10 text-white/80 hover:bg-white/15"
            : "bg-gradient-to-r from-emerald-400 to-cyan-500 text-black"
        }`}
      >
        {active ? "Desativar microfone" : "Ativar microfone"}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${info.dotClass}`} />
        <span className="text-sm text-white/70">{info.label}</span>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Volume</p>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-[width] duration-75"
            style={{ width: `${volumePercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl bg-white/5 px-3 py-2">
          <span className="text-xl font-bold text-cyan-300 tabular-nums">
            {frequency ? `${frequency.toFixed(1)}` : "—"}
          </span>
          <span className="text-xs uppercase tracking-wide text-white/50">Hz</span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-white/5 px-3 py-2">
          <span className="text-xl font-bold text-pink-400 neon-text">
            {noteName ?? "—"}
          </span>
          <span className="text-xs uppercase tracking-wide text-white/50">Nota</span>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-white/40">
          Tolerancia de nota
        </p>
        <div className="flex gap-2">
          {([0, 1] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onToleranceChange(option)}
              className={`btn-neon flex-1 rounded-lg py-2 text-sm font-semibold ${
                tolerance === option
                  ? "bg-purple-500 text-white shadow-md shadow-purple-500/50"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {option === 0 ? "Exata" : "±1 semitom"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
