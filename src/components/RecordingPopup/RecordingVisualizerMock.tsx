import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "./RecordingPopup.css";

type Props = {
  isActive?: boolean;
  onCanvasReady?: (el: HTMLCanvasElement | null) => void;
  managed?: boolean;
};

export interface RecordingVisualizerHandle {
  start: () => void;
  stop: () => void;
}

const RecordingVisualizerMock = forwardRef<RecordingVisualizerHandle, Props>(
  ({ isActive = true, onCanvasReady, managed = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const dataArrayRef = useRef<Uint8Array>(new Uint8Array(128));
    const [_visible, setVisible] = useState(false);

    const generateSineWave = (
      data: Uint8Array,
      freq = 440,
      sampleRate = 44100,
      t = 0
    ) => {
      const len = data.length;
      for (let i = 0; i < len; i++) {
        const angle = (2 * Math.PI * freq * (t * 0.001 + i)) / sampleRate;
        // normalize to 0–255
        data[i] = Math.floor((Math.sin(angle) * 0.5 + 0.5) * 255);
      }
      return data;
    };

    useEffect(() => {
      if (onCanvasReady) onCanvasReady(canvasRef.current);
      return () => {
        if (onCanvasReady) onCanvasReady(null);
      };
    }, [onCanvasReady]);

    useEffect(() => {
      if (isActive) {
        setVisible(true);
        if (!managed) start();
      } else {
        stop();
        const timeout = setTimeout(() => setVisible(false), 150);
        return () => clearTimeout(timeout);
      }
      return () => stop();
    }, [isActive, managed]);

    useImperativeHandle(ref, () => ({
      start,
      stop,
    }));

    const start = () => {
      draw();
    };

    const stop = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sampleRate = 48000;
      const fftSize = 256;
      const minHz = 400;
      const maxHz = 5000;
      const binWidth = sampleRate / fftSize;
      const minIndex = Math.floor(minHz / binWidth);
      const maxIndex = Math.ceil(maxHz / binWidth);

      const loop = () => {
        animationFrameRef.current = requestAnimationFrame(loop);

        const arr = dataArrayRef.current;

        const now = performance.now() / 1000;
        const freq = 440; // A4 note
        generateSineWave(arr, freq, 44100, now * 44100); // advance time sample by sample

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const voiceBins = arr.slice(minIndex, maxIndex);

        const gap = 2;
        const barWidth =
          (canvas.width - gap * (voiceBins.length - 1)) / voiceBins.length;
        let x = 0;
        const centerY = canvas.height / 2;

        for (let i = 0; i < voiceBins.length; i++) {
          const raw = voiceBins[i];
          const minVisualHeight = 2;
          const normalized = raw / 1000;
          const scaledHeight = Math.pow(normalized, 0.75) * canvas.height;
          const barHeight = Math.max(scaledHeight, minVisualHeight);

          // hue cycles across bars; add a small time offset so the rainbow drifts
          const hueBase = (i / Math.max(1, voiceBins.length)) * 360;
          const timeOffset = (now * 300) % 360; // degrees per second
          const hue = (hueBase + timeOffset) % 360;
          const color = `hsl(${hue.toFixed(1)}, 100%, 50%)`;

          const radius = 4;
          drawMirroredBar(ctx, x, barWidth, centerY, barHeight, radius, color);
          x += barWidth + gap;
        }
      };

      loop();
    };

    const drawMirroredBar = (
      ctx: CanvasRenderingContext2D,
      x: number,
      width: number,
      centerY: number,
      height: number,
      radius = 4,
      color = "#aaaaaa"
    ) => {
      // Draw top bar (magenta)
      ctx.save();
      ctx.fillStyle = color;
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
      ctx.restore();

      // Draw bottom bar (magenta)
      ctx.save();
      ctx.fillStyle = color;
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
      ctx.restore();

      // Optionally, add a black stroke for visibility
      // ctx.save();
      // ctx.strokeStyle = "#000";
      // ctx.lineWidth = 1;
      // ctx.stroke();
      // ctx.restore();
    };

    return (
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div
          className={`mb-2 px-3 py-2 bg-white/80 rounded-xl shadow-lg transition-all duration-150 flex items-center gap-2 ${
            isActive ? "animate-fade-blur-in" : "animate-fade-blur-out"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="animate-pulse-fade"
          >
            <circle cx="6" cy="6" r="6" fill="red" />
          </svg>
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="pointer-events-none"
          />
        </div>
      </div>
    );
  }
);

export default RecordingVisualizerMock;
