import { useCallback, useEffect, useRef, useState } from "react";
import { midiToNoteName } from "../utils/music";

export type MicStatus = "off" | "listening" | "no-signal" | "detecting";

export interface PitchReading {
  frequency: number;
  midi: number;
  noteName: string;
}

// RMS abaixo disso é tratado como ruído/silêncio
const RMS_NOISE_FLOOR = 0.012;
// Faixa útil de guitarra: E2 (~82Hz) até acima da 24ª casa da corda E4
const MIN_FREQ = 55;
const MAX_FREQ = 1500;
// Limita re-renders do React (a análise continua a cada frame)
const UI_UPDATE_MS = 80;

export function frequencyToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

function isIpadOrIphone(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function describeMicError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      if (isIpadOrIphone()) {
        return (
          "O navegador bloqueou o microfone. No iPad/Safari: toque em “aA” " +
          "na barra de endereço → Configurações do Site → Microfone → Permitir, " +
          "e clique em Ativar de novo. O jogo continua funcionando pelo teclado."
        );
      }
      return (
        "Permissão do microfone negada pelo navegador. Libere o microfone nas " +
        "configurações do site e clique em Ativar de novo. O jogo continua " +
        "funcionando pelo teclado."
      );
    }
    if (err.name === "NotFoundError") {
      return "Nenhum microfone encontrado. O jogo continua funcionando pelo teclado.";
    }
  }
  return "Não foi possível acessar o microfone. O jogo continua funcionando pelo teclado.";
}

// Autocorrelation ACF2+ — retorna a frequência fundamental ou -1
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;

  // recorta bordas de baixa amplitude para focar na parte útil do sinal
  let r1 = 0;
  let r2 = SIZE - 1;
  const edgeThreshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < edgeThreshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < edgeThreshold) {
      r2 = SIZE - i;
      break;
    }
  }

  const buf = buffer.slice(r1, r2);
  const size = buf.length;
  if (size < 64) return -1;

  const c = new Float32Array(size);
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += buf[i] * buf[i + lag];
    }
    c[lag] = sum;
  }

  // pula o pico em lag=0 até o primeiro vale
  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;

  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0) return -1;

  // interpolação parabólica para precisão sub-amostra
  let T0 = maxpos;
  if (T0 > 0 && T0 < size - 1) {
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
  }

  const freq = sampleRate / T0;
  if (freq < MIN_FREQ || freq > MAX_FREQ) return -1;
  return freq;
}

export function usePitchDetection(onNoteOnset?: (midi: number) => void) {
  const [status, setStatus] = useState<MicStatus>("off");
  const [volume, setVolume] = useState(0);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [noteName, setNoteName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastMidiRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const lastStatusRef = useRef<MicStatus>("off");
  const onNoteOnsetRef = useRef(onNoteOnset);

  useEffect(() => {
    onNoteOnsetRef.current = onNoteOnset;
  }, [onNoteOnset]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    lastMidiRef.current = null;
    lastStatusRef.current = "off";
    setStatus("off");
    setVolume(0);
    setFrequency(null);
    setNoteName(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Microfone não disponível neste navegador/contexto. O jogo continua funcionando pelo teclado.",
      );
      return;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) {
      setError(
        "Web Audio não suportado neste navegador. O jogo continua funcionando pelo teclado.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioContext = new AudioContextCtor();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      lastStatusRef.current = "listening";
      setStatus("listening");

      const timeData = new Float32Array(analyser.fftSize);

      const analyze = () => {
        const currentAnalyser = analyserRef.current;
        const currentContext = audioContextRef.current;
        if (!currentAnalyser || !currentContext) return;

        currentAnalyser.getFloatTimeDomainData(timeData);

        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          sumSquares += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sumSquares / timeData.length);

        let freq = -1;
        let nextStatus: MicStatus = "no-signal";

        if (rms >= RMS_NOISE_FLOOR) {
          freq = autoCorrelate(timeData, currentContext.sampleRate);
          nextStatus = freq > 0 ? "detecting" : "listening";
        }

        const midi = freq > 0 ? frequencyToMidi(freq) : null;

        // onset: dispara só quando a nota muda (ou volta depois de silêncio),
        // para uma nota sustentada não contar como vários acertos
        if (midi !== null && midi !== lastMidiRef.current) {
          onNoteOnsetRef.current?.(midi);
        }
        lastMidiRef.current = midi;

        const now = performance.now();
        if (
          now - lastUiUpdateRef.current >= UI_UPDATE_MS ||
          nextStatus !== lastStatusRef.current
        ) {
          lastUiUpdateRef.current = now;
          lastStatusRef.current = nextStatus;
          setStatus(nextStatus);
          setVolume(rms);
          setFrequency(freq > 0 ? freq : null);
          setNoteName(midi !== null ? midiToNoteName(midi) : null);
        }

        rafRef.current = requestAnimationFrame(analyze);
      };

      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      setError(describeMicError(err));
      stop();
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    status,
    volume,
    frequency,
    noteName,
    error,
    active: status !== "off",
    start,
    stop,
  };
}
