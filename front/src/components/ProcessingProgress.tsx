import { Check, Loader2, X, Keyboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

export type ProcessingStage = "idle" | "transcribing" | "analyzing" | "generating" | "complete";

interface ProcessingProgressProps {
  currentStage: ProcessingStage;
  onCancel?: () => void;
}

const stages = [
  { id: "transcribing", label: "Transcribing Audio", progress: 33 },
  { id: "analyzing", label: "Analyzing Conversation", progress: 66 },
  { id: "generating", label: "Generating CRM Actions", progress: 100 }
];

export const ProcessingProgress = ({ currentStage, onCancel }: ProcessingProgressProps) => {
  const [isCancelling, setIsCancelling] = useState(false);
  
  if (currentStage === "idle" && !isCancelling) return null;

  const currentStageIndex = stages.findIndex(s => s.id === currentStage);
  const progressValue = currentStage === "complete" ? 100 : stages[currentStageIndex]?.progress || 0;
  const canCancel = currentStage !== "complete";

  const handleCancel = () => {
    setIsCancelling(true);
    setTimeout(() => {
      onCancel?.();
      setIsCancelling(false);
    }, 400);
  };

  return (
    <Card className={`p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 group relative transition-all duration-300 ${
      isCancelling ? "animate-scale-out opacity-0" : "animate-fade-in"
    }`}>
      <TooltipProvider>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {currentStage === "complete" ? "Processing Complete" : "Processing Audio"}
              </h3>
              {canCancel && onCancel && (
                <>
                  <Button
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                    title="Cancel processing (Esc)"
                    disabled={isCancelling}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out animate-fade-in">
                        <Keyboard className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors duration-200 hover:scale-110 transform" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs animate-scale-in">
                      <div className="space-y-1">
                        <p className="font-semibold">Keyboard Shortcuts</p>
                        <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
                            Esc
                          </kbd>
                          <span>Cancel processing</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStage === "complete" ? "100%" : `${progressValue}%`}
            </span>
          </div>

        <Progress value={progressValue} className="h-2" />

        <div className="space-y-2 mt-4">
          {stages.map((stage, index) => {
            const isComplete = currentStageIndex > index || currentStage === "complete";
            const isCurrent = stage.id === currentStage;
            const isPending = currentStageIndex < index && currentStage !== "complete";

            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 p-2 rounded-md transition-all duration-300 ${
                  isCurrent ? "bg-primary/10 scale-105" : ""
                } ${isComplete ? "animate-fade-in" : ""}`}
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-sm transition-all duration-300 ${
                    isComplete
                      ? "text-foreground font-medium"
                      : isCurrent
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        </div>
      </TooltipProvider>
    </Card>
  );
};
