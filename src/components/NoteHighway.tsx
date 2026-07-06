import { useEffect, useRef } from "react";
import type { JudgementEvent, NoteEvent } from "../types";
import { STRING_COLORS, STRING_KEYS } from "../utils/music";

interface NoteHighwayProps {
  notesRef: React.MutableRefObject<NoteEvent[]>;
  subscribeFrame: (cb: (time: number) => void) => () => void;
  subscribeJudgement: (cb: (event: JudgementEvent) => void) => () => void;
}

const LOOKAHEAD_SEC = 2.6;
const HIT_LINE_RATIO = 0.86;
const POPUP_LIFETIME_MS = 550;

interface JudgementPopup {
  stringIndex: number;
  label: string;
  color: string;
  createdAt: number;
}

const JUDGEMENT_LABEL: Record<JudgementEvent["judgement"], string> = {
  perfect: "PERFECT!",
  good: "GOOD",
  miss: "MISS",
};

// ctx.roundRect só existe no Safari 16+; sem fallback, o desenho da nota
// lança e derruba o loop do jogo em iPads mais antigos
function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function NoteHighway({ notesRef, subscribeFrame, subscribeJudgement }: NoteHighwayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const popupsRef = useRef<JudgementPopup[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resizeCanvas() {
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeJudgement((event) => {
      popupsRef.current.push({
        stringIndex: event.stringIndex,
        label: JUDGEMENT_LABEL[event.judgement],
        color: event.judgement === "miss" ? "#ff4d6d" : STRING_COLORS[event.stringIndex],
        createdAt: performance.now(),
      });
    });
    return unsubscribe;
  }, [subscribeJudgement]);

  useEffect(() => {
    function draw(currentTime: number) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;
      const hitLineY = height * HIT_LINE_RATIO;
      const laneWidth = width / STRING_KEYS.length;

      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#0a0714");
      bgGradient.addColorStop(1, "#150a24");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < STRING_KEYS.length; i++) {
        const x = i * laneWidth;
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.045)";
        ctx.fillRect(x, 0, laneWidth, height);

        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      ctx.save();
      ctx.shadowColor = "#2ff2ff";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = "#2ff2ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(width, hitLineY);
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < STRING_KEYS.length; i++) {
        const x = i * laneWidth + laneWidth / 2;
        const color = STRING_COLORS[i];
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, hitLineY + 26, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#050309";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(STRING_KEYS[i], x, hitLineY + 27);
      }

      const notes = notesRef.current;
      for (const note of notes) {
        if (note.hit) continue;
        const delta = note.time - currentTime;
        if (delta > LOOKAHEAD_SEC || delta < -0.4) continue;

        const progress = 1 - delta / LOOKAHEAD_SEC;
        const y = progress * hitLineY;
        const x = note.stringIndex * laneWidth + laneWidth / 2;
        const noteHeight = Math.max(18, (note.duration / LOOKAHEAD_SEC) * hitLineY);
        const noteWidth = laneWidth * 0.6;
        const color = STRING_COLORS[note.stringIndex];

        ctx.save();
        if (note.missed) {
          ctx.globalAlpha = Math.max(0, 1 - (currentTime - note.time) / 0.4);
          ctx.fillStyle = "#555566";
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
        }

        const rectX = x - noteWidth / 2;
        const rectY = y - noteHeight;
        const radius = 8;
        ctx.beginPath();
        traceRoundedRect(ctx, rectX, rectY, noteWidth, noteHeight, radius);
        ctx.fill();
        ctx.restore();
      }

      const now = performance.now();
      popupsRef.current = popupsRef.current.filter(
        (popup) => now - popup.createdAt < POPUP_LIFETIME_MS,
      );

      for (const popup of popupsRef.current) {
        const age = now - popup.createdAt;
        const t = age / POPUP_LIFETIME_MS;
        const x = popup.stringIndex * laneWidth + laneWidth / 2;
        const y = hitLineY - 40 - t * 30;

        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = popup.color;
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 12;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(popup.label, x, y);
        ctx.restore();
      }
    }

    const unsubscribe = subscribeFrame(draw);
    return unsubscribe;
  }, [notesRef, subscribeFrame]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl neon-border bg-[#0a0714]"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
