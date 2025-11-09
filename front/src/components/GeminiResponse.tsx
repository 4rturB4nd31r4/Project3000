import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

interface GeminiResponseProps {
  transcription: string;
  response: string;
  onSendToGemini: () => void;
}

export const GeminiResponse = ({ transcription, response, onSendToGemini }: GeminiResponseProps) => {
  const handleSend = () => {
    if (!transcription) {
      toast.error("No transcription to send to Gemini");
      return;
    }
    onSendToGemini();
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg h-full">
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Gemini Analysis</h3>
          </div>
          <Button 
            onClick={handleSend}
            disabled={!transcription}
            className="bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity"
            size="sm"
          >
            <Send className="mr-2 h-4 w-4" />
            Send to Gemini
          </Button>
        </div>
        
        <ScrollArea className="flex-1 rounded-md border border-border/50 bg-muted/30 p-4">
          {response ? (
            <p className="text-foreground leading-relaxed">{response}</p>
          ) : (
            <p className="text-muted-foreground italic">
              Gemini's response will appear here after processing...
            </p>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Backend Integration Point: POST transcription to your Python API at /gemini
        </p>
      </div>
    </Card>
  );
};
