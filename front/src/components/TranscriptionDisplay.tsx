import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface TranscriptionDisplayProps {
  text: string;
}

export const TranscriptionDisplay = ({ text }: TranscriptionDisplayProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg h-full">
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Transcription</h3>
        </div>
        
        <ScrollArea className="flex-1 rounded-md border border-border/50 bg-muted/30 p-4">
          {text ? (
            <p className="text-foreground leading-relaxed">{text}</p>
          ) : (
            <p className="text-muted-foreground italic">
              Your transcription will appear here once audio is processed...
            </p>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Output from: /transcribe endpoint
        </p>
      </div>
    </Card>
  );
};
