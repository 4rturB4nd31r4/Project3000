import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isPaused?: boolean;
}

// Helper function to get computed CSS color with optional alpha
const getCSSColor = (varName: string, alpha?: number): string => {
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(varName).trim();
  
  if (!value) return alpha ? `rgba(136, 136, 136, ${alpha})` : "#888888"; // fallback
  
  // If it's HSL values (e.g., "240 10% 3.9%"), convert to proper hsl() with optional alpha
  if (value.includes("%")) {
    if (alpha !== undefined) {
      return `hsl(${value} / ${alpha})`;
    }
    return `hsl(${value})`;
  }
  
  // Otherwise return as-is
  return value;
};

export const AudioWaveform = ({ analyser, isActive, isPaused }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive || isPaused) {
        // Draw flat line when paused
        ctx.fillStyle = getCSSColor("--muted");
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = getCSSColor("--primary");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Create gradient background with proper alpha values
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, getCSSColor("--muted", 0.5));
      gradient.addColorStop(1, getCSSColor("--muted", 0.8));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform with gradient
      ctx.lineWidth = 2;
      const waveGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      waveGradient.addColorStop(0, getCSSColor("--primary"));
      waveGradient.addColorStop(0.5, getCSSColor("--accent"));
      waveGradient.addColorStop(1, getCSSColor("--primary"));
      ctx.strokeStyle = waveGradient;
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = getCSSColor("--primary", 0.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive, isPaused]);

  if (!isActive) return null;

  return (
    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-primary/20 bg-muted/30 animate-fade-in">
      <canvas
        ref={canvasRef}
        width={800}
        height={96}
        className="w-full h-full"
      />
      <div className="absolute top-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs font-medium text-muted-foreground">
        {isPaused ? "Paused" : "Live"}
      </div>
    </div>
  );
};
