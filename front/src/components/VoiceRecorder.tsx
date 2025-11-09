import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Upload, Loader2, Trash2, Download, Keyboard, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioWaveform } from "./AudioWaveform";
import { WaveformAudioPlayer } from "./WaveformAudioPlayer";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onTranscriptionStart?: () => void;
}

export const VoiceRecorder = ({ onTranscriptionComplete, onTranscriptionStart }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [exportFormat, setExportFormat] = useState<"webm" | "wav">("webm");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space to start recording (only when not recording)
      if (e.code === 'Space' && !isProcessing && !isRecording) {
        e.preventDefault();
        startRecording();
      }

      // P to pause/resume recording
      if (e.key.toLowerCase() === 'p' && isRecording && !isProcessing) {
        e.preventDefault();
        if (isPaused) {
          resumeRecording();
        } else {
          pauseRecording();
        }
      }

      // S to stop recording
      if (e.key.toLowerCase() === 's' && isRecording && !isProcessing) {
        e.preventDefault();
        stopRecording();
      }

      // Enter to process audio
      if (e.key === 'Enter' && audioBlob && !isProcessing && !isRecording) {
        e.preventDefault();
        sendToBackend();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRecording, isPaused, audioBlob, isProcessing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API for waveform visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        
        // Cleanup audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
          analyserRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to access microphone");
      console.error(error);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info("Recording paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.success("Recording resumed");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      toast.success("Recording stopped");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      toast.success("Audio file uploaded");
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    toast.success("Audio cleared");
  };

  const downloadAudio = async () => {
    if (!audioBlob || !audioUrl) return;
    
    try {
      let downloadBlob = audioBlob;
      let filename = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
      
      // Convert based on selected format
      if (exportFormat === "wav") {
        toast.info("Converting to WAV format...");
        downloadBlob = await convertToWav(audioBlob);
        filename += '.wav';
      } else {
        filename += '.webm';
      }
      
      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Audio downloaded as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to download audio");
      console.error(error);
    }
  };

  // Convert audio to WAV format
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // "RIFF" chunk descriptor
    setUint32(0x46464952);
    setUint32(length + 36);
    setUint32(0x45564157);
    
    // "fmt " sub-chunk
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numberOfChannels);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numberOfChannels);
    setUint16(numberOfChannels * 2);
    setUint16(16);
    
    // "data" sub-chunk
    setUint32(0x61746164);
    setUint32(length);

    // Write interleaved audio data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < buffer.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    await audioContext.close();
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const sendToBackend = async () => {
    if (!audioBlob) {
      toast.error("No audio to process");
      return;
    }

    setIsProcessing(true);
    onTranscriptionStart?.();
    
    // This is where you'll integrate with your Python backend
    // Convert blob to base64 or FormData and send to your API endpoint
    const formData = new FormData();
    formData.append("audio", audioBlob);
    
    // Example API call structure:
    // const response = await fetch("YOUR_PYTHON_BACKEND_URL/transcribe", {
    //   method: "POST",
    //   body: formData,
    // });
    // const data = await response.json();
    // onTranscriptionComplete(data.transcription);

    // Simulated response for demo
    setTimeout(() => {
      onTranscriptionComplete("This is where your speech-to-text transcription will appear. Connect your Python backend to /process endpoint.");
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg group">
      <TooltipProvider>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">Voice Input</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out animate-fade-in">
                    <Keyboard className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors duration-200 hover:scale-110 transform cursor-help" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs animate-scale-in">
                  <div className="space-y-2">
                    <p className="font-semibold">Keyboard Shortcuts</p>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
                        Space
                      </kbd>
                      <span>Start recording</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
                        P
                      </kbd>
                      <span>Pause/Resume</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
                        S
                      </kbd>
                      <span>Stop recording</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
                        Enter
                      </kbd>
                      <span>Process audio</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          {isRecording && (
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-accent' : 'bg-destructive animate-pulse'}`} />
              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground">
                  {isPaused ? "Paused" : "Recording..."}
                </span>
                <span className="text-lg font-mono font-semibold text-foreground tabular-nums">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Waveform Visualizer */}
          <AudioWaveform 
            analyser={analyserRef.current} 
            isActive={isRecording} 
            isPaused={isPaused}
          />

          <div className="flex gap-3 items-stretch">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                size="lg"
                title="Start recording (Space)"
              >
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  variant="secondary"
                  className="flex-1 shadow-md"
                  size="lg"
                  title={isPaused ? "Resume recording (P)" : "Pause recording (P)"}
                >
                  {isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1 shadow-md"
                  size="lg"
                  title="Stop recording (S)"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </>
            )}

            <div className="relative">
              <input
                type="file"
                accept="audio/*,.opus,.ogg,.m4a,.wav,.mp3,.aac"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="audio-upload"
              />
              <Button variant="secondary" size="lg" className="shadow-md" asChild>
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <Upload className="h-5 w-5" />
                </label>
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Upload audio from: WhatsApp recordings, phone calls, or any audio file
          </p>
        </div>

        {audioBlob && (
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">Audio Preview</p>
                <div className="flex items-center gap-2">
                  <Select value={exportFormat} onValueChange={(value: "webm" | "wav") => setExportFormat(value)}>
                    <SelectTrigger className="h-8 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webm">WebM</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadAudio}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent"
                    title={`Download as ${exportFormat.toUpperCase()}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAudio}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Clear audio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <WaveformAudioPlayer audioBlob={audioBlob} audioUrl={audioUrl || ""} />
            </div>
            
            <Button
              onClick={sendToBackend}
              disabled={isProcessing}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg font-semibold"
              size="lg"
              title="Process audio (Enter)"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Audio"
              )}
            </Button>
          </div>
        )}

          <p className="text-xs text-muted-foreground text-center">
            Backend Integration Point: POST to your Python API at /process
          </p>
        </div>
      </TooltipProvider>
    </Card>
  );
};
