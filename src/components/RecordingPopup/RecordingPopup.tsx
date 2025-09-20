import { useEffect, useRef, useState } from "react";
import "./RecordingPopup.css";

type Props = {
  isRecording: boolean;
};

function RecordingPopup({ isRecording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRecording) {
      setVisible(true);
      startWaveform();
    } else {
      stopWaveform();
      const timeout = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(timeout);
    }

    return () => {
      stopWaveform();
    };
  }, [isRecording]);

  const startWaveform = async () => {
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // Resume the audio context before using it
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;

    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    sourceRef.current.connect(analyserRef.current);

    draw();
  };

  const stopWaveform = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch((err) => {
        console.warn("AudioContext close failed:", err);
      });
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
  };

  const draw = () => {
    if (!canvasRef.current || !audioContextRef.current || !analyserRef.current)
      return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const sampleRate = audioContextRef.current.sampleRate;
    const fftSize = analyserRef.current.fftSize;

    const minHz = 400;
    const maxHz = 3000;
    const binWidth = sampleRate / fftSize;

    const minIndex = Math.floor(minHz / binWidth);
    const maxIndex = Math.ceil(maxHz / binWidth);

    const drawLoop = () => {
      if (
        !ctx ||
        !dataArrayRef.current ||
        !audioContextRef.current ||
        !analyserRef.current
      )
        return;

      animationFrameRef.current = requestAnimationFrame(drawLoop);
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const voiceBins = dataArrayRef.current.slice(minIndex, maxIndex);
      const gap = 2;
      const barWidth =
        (canvas.width - gap * (voiceBins.length - 1)) / voiceBins.length;
      let x = 0;

      const centerY = canvas.height / 2;

      for (let i = 0; i < voiceBins.length; i++) {
        const raw = voiceBins[i];
        const minVisualHeight = 2;
        const normalized = raw / 255;
        const scaledHeight = Math.pow(normalized, 0.75) * (canvas.height / 2);
        const barHeight = Math.max(scaledHeight, minVisualHeight);
        const radius = 4;

        drawMirroredBar(ctx, x, barWidth, centerY, barHeight, radius);

        x += barWidth + gap;
      }
    };

    drawLoop();
  };

  const drawMirroredBar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    width: number,
    centerY: number,
    height: number,
    radius = 4,
    color = "#ffffff"
  ) => {
    ctx.fillStyle = color;

    // Top half (rounded top, flat bottom)
    const topY = centerY - height;
    ctx.beginPath();
    ctx.moveTo(x + radius, topY);
    ctx.lineTo(x + width - radius, topY);
    ctx.quadraticCurveTo(x + width, topY, x + width, topY + radius);
    ctx.lineTo(x + width, centerY);
    ctx.lineTo(x, centerY);
    ctx.lineTo(x, topY + radius);
    ctx.quadraticCurveTo(x, topY, x + radius, topY);
    ctx.closePath();
    ctx.fill();

    // Bottom half (flat top, rounded bottom)
    const bottomY = centerY + height;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.lineTo(x + width, bottomY - radius);
    ctx.quadraticCurveTo(x + width, bottomY, x + width - radius, bottomY);
    ctx.lineTo(x + radius, bottomY);
    ctx.quadraticCurveTo(x, bottomY, x, bottomY - radius);
    ctx.closePath();
    ctx.fill();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div
        className={`mb-2 px-3 py-2 bg-black/80 rounded-xl shadow-lg transition-all duration-150 flex items-center gap-2 ${
          isRecording ? "animate-fade-blur-in" : "animate-fade-blur-out"
        }`}
      >
        {/* Red circle SVG */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={"animate-pulse-fade"}
        >
          <circle cx="6" cy="6" r="6" fill="red" />
        </svg>

        {/* Waveform canvas */}
        <canvas
          ref={canvasRef}
          width={150}
          height={40}
          className="pointer-events-none"
        />
      </div>
    </div>
  );
}

export default RecordingPopup;
