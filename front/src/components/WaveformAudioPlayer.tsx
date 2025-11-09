import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaveformAudioPlayerProps {
  audioBlob: Blob;
  audioUrl: string;
}

export const WaveformAudioPlayer = ({ audioBlob, audioUrl }: WaveformAudioPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const animationRef = useRef<number>();

  // Generate waveform data from audio
  useEffect(() => {
    const generateWaveform = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const rawData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize the data
        const max = Math.max(...filteredData);
        const normalized = filteredData.map(val => val / max);
        
        setWaveformData(normalized);
        audioContext.close();
      } catch (error) {
        console.error("Error generating waveform:", error);
      }
    };

    generateWaveform();
  }, [audioBlob]);

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / waveformData.length;
      const progress = duration > 0 ? currentTime / duration : 0;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Get colors from CSS variables
      const root = document.documentElement;
      const primaryValue = getComputedStyle(root).getPropertyValue("--primary").trim();
      const mutedValue = getComputedStyle(root).getPropertyValue("--muted-foreground").trim();
      
      const primaryColor = `hsl(${primaryValue})`;
      const mutedColor = `hsl(${mutedValue})`;

      // Draw waveform bars
      waveformData.forEach((value, index) => {
        const x = index * barWidth;
        const barHeight = value * height * 0.8;
        const y = (height - barHeight) / 2;
        
        // Color bars based on play progress
        const barProgress = index / waveformData.length;
        ctx.fillStyle = barProgress <= progress ? primaryColor : mutedColor;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      });
    };

    draw();
  }, [waveformData, currentTime, duration]);

  // Update current time during playback
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };

    animationRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    
    audioRef.current.currentTime = progress * duration;
    setCurrentTime(progress * duration);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />
      
      <div className="flex items-center gap-3">
        <Button
          onClick={handlePlayPause}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1">
          <canvas
            ref={canvasRef}
            width={800}
            height={60}
            onClick={handleCanvasClick}
            className="w-full h-[60px] cursor-pointer rounded hover:opacity-80 transition-opacity"
          />
        </div>

        <span className="text-xs text-muted-foreground font-mono tabular-nums min-w-[45px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
