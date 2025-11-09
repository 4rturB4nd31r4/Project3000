import { useState, useEffect, useRef } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { HubSpotPanel } from "@/components/HubSpotPanel";
import { CRMAuth, CRMUserData } from "@/components/CRMAuth";
import { Header } from "@/components/Header";
import { ProcessingProgress, ProcessingStage } from "@/components/ProcessingProgress";
import { toast } from "sonner";
import { Github, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [crmUser, setCrmUser] = useState<CRMUserData | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [transcription, setTranscription] = useState("");
  const [geminiResponse, setGeminiResponse] = useState("");
  const [proposedActions, setProposedActions] = useState(null);
  const [hubspotData, setHubspotData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("idle");
  const [processingAbortController, setProcessingAbortController] = useState<AbortController | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const activeSessionRef = useRef<string | null>(null); // Track active processing session

  useEffect(() => {
    // Check if user is already authenticated
    const storedUser = localStorage.getItem("crm_user");
    if (storedUser) {
      setCrmUser(JSON.parse(storedUser));
    }
    setIsCheckingAuth(false);
  }, []);

  // Keyboard shortcut: Esc to cancel processing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && processingStage !== "idle" && processingStage !== "complete") {
        handleCancelProcessing();
      }
    };

    if (processingStage !== "idle" && processingStage !== "complete") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [processingStage]);

  const handleTranscriptionComplete = (text: string) => {
    console.log("Transcription complete, activeSession:", activeSessionRef.current);
    
    // Check if this session is still active
    if (!activeSessionRef.current) {
      console.log("No active session, ignoring transcription");
      return;
    }
    
    setTranscription(text);
    setGeminiResponse("");
    setProposedActions(null);
    setHubspotData(null);
    setProcessingStage("analyzing");
    handleSendToGemini();
  };

  const handleTranscriptionStart = () => {
    console.log("Starting new transcription process");
    const sessionId = Date.now().toString();
    activeSessionRef.current = sessionId;
    setIsCancelled(false);
    setProcessingStage("transcribing");
  };

  const handleSendToGemini = async () => {
    console.log("handleSendToGemini called, isCancelled:", isCancelled);
    
    setIsAnalyzing(true);
    
    // Create abort controller for this processing session
    const abortController = new AbortController();
    setProcessingAbortController(abortController);
    
    // Simulated response for demo with stage transitions
    const timer1 = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.log("Moving to generating stage");
        setProcessingStage("generating");
      } else {
        console.log("Timer1 aborted");
      }
    }, 800);

    const timer2 = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.log("Processing complete, showing results");
        // Simulated proposed CRM actions
        setProposedActions({
          contact: {
            name: "John Doe",
            action: "update",
            changes: [
              { field: "Lifecycle Stage", value: "Opportunity" },
              { field: "Lead Status", value: "Qualified" },
              { field: "Notes", value: "Expressed interest in premium features during call" }
            ]
          },
          task: {
            title: "Follow up on pricing inquiry",
            due_date: new Date(Date.now() + 86400000).toLocaleDateString(),
            priority: "High"
          }
        });
        
        setProcessingStage("complete");
        setIsAnalyzing(false);
        toast.success("Review the proposed CRM actions below");
        
        // Reset to idle after a brief moment
        setTimeout(() => {
          setProcessingStage("idle");
          setProcessingAbortController(null);
          activeSessionRef.current = null; // Clear session when complete
        }, 2000);
      } else {
        console.log("Timer2 aborted");
      }
    }, 2000);

    // Listen for abort
    abortController.signal.addEventListener('abort', () => {
      console.log("Abort signal received");
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
    });
  };

  const handleCancelProcessing = () => {
    console.log("Cancelling processing - clearing active session");
    
    // Clear the active session to prevent any pending operations from proceeding
    activeSessionRef.current = null;
    
    // Set cancellation flag
    setIsCancelled(true);
    
    // Abort any ongoing processing
    if (processingAbortController) {
      processingAbortController.abort();
      setProcessingAbortController(null);
    }
    
    // Reset all state
    setProcessingStage("idle");
    setIsAnalyzing(false);
    
    toast.info("Processing cancelled");
  };

  const handleConfirmActions = async () => {
    // Simulated HubSpot sync after confirmation
    const mockData = {
      contact: {
        id: "12345",
        firstname: "John",
        lastname: "Doe",
        email: "john.doe@example.com",
        lifecycle_stage: "opportunity",
        lead_status: "qualified",
      },
      task_created: {
        id: "task_789",
        title: "Follow up on pricing inquiry",
      },
      lastSync: new Date().toISOString(),
      status: "success",
    };
    setHubspotData(mockData);
    setProposedActions(null);
  };

  const handleRejectActions = () => {
    setProposedActions(null);
    toast.info("Actions cancelled. Process a new recording to try again");
  };

  const handleAuthSuccess = (userData: CRMUserData) => {
    setCrmUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("crm_user");
    setCrmUser(null);
    toast.info("Disconnected from CRM");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!crmUser) {
    return <CRMAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <Header user={crmUser} onLogout={handleLogout} />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 py-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Voice CRM Assistant
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Record your sales conversations and automatically update your CRM
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
          {/* Voice Recorder */}
          <VoiceRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            onTranscriptionStart={handleTranscriptionStart}
          />

          {/* Processing Progress */}
          <ProcessingProgress 
            currentStage={processingStage} 
            onCancel={handleCancelProcessing}
          />

          {/* HubSpot Panel */}
          <HubSpotPanel 
            proposedActions={proposedActions} 
            data={hubspotData} 
            onConfirm={handleConfirmActions}
            onReject={handleRejectActions}
          />
        </div>

        {/* Backend Integration Guide */}
        <div className="mt-8 p-6 rounded-lg bg-card border border-border/50 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-foreground mb-3">Pipeline Flow & Backend Integration</h3>
          <div className="mb-4 p-3 bg-muted/30 rounded-md border border-border/50">
            <p className="text-sm text-muted-foreground">
              Audio Input → Processing → <span className="text-accent font-medium">Review CRM Actions</span> → User Confirmation → Execute
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-primary">POST /process</p>
              <p className="text-muted-foreground">Accepts audio file (WhatsApp, phone calls, recordings), returns proposed CRM actions</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-accent">POST /crm/sync</p>
              <p className="text-muted-foreground">Executes confirmed CRM actions after user approval</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-16 pb-8 bg-gradient-to-t from-muted/50 via-muted/20 to-transparent border-t border-border/40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center space-y-2 mb-10">
              <p className="text-base font-semibold text-foreground">
                Developed by 404 O(1/n) BaNaNa Megalodon3000
              </p>
              <p className="text-sm text-muted-foreground">
                CentraleSupélec
              </p>
            </div>
            
            {/* Team Members Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Member 1 */}
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl shadow-[var(--shadow-soft)]">
                  AB
                </div>
                <p className="text-sm font-semibold text-foreground">Artur Bandeira Chan Jorge</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://www.linkedin.com/in/artur-bandeira-chan-jorge-b7646327a/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://github.com/ArturBandeira" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="mailto:arturbchanj@gmail.com" aria-label="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Member 2 */}
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-accent-foreground font-bold text-xl shadow-[var(--shadow-soft)]">
                  HG
                </div>
                <p className="text-sm font-semibold text-foreground">Heitor Gama Ribeiro</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://www.linkedin.com/in/heitor-gama-ribeiro" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://github.com/baunilhamarga" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="mailto:heitor_gama@usp.br" aria-label="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Member 3 */}
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-[var(--shadow-soft)]">
                  HS
                </div>
                <p className="text-sm font-semibold text-foreground">Henrique Souza de Abreu Martins</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://www.linkedin.com/in/henrique-souza-de-abreu-martins-159274383/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://github.com/HenriqueSAMartins" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="mailto:henrique.souzaamartins@gmail.com" aria-label="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Member 4 */}
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent via-primary to-accent flex items-center justify-center text-accent-foreground font-bold text-xl shadow-[var(--shadow-soft)]">
                  PL
                </div>
                <p className="text-sm font-semibold text-foreground">Pedro Lubaszewski Lima</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://www.linkedin.com/in/pedro-lubaszewski/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="https://github.com/PLLima" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    asChild
                  >
                    <a href="mailto:pedro.lubaszewski.lima@gmail.com" aria-label="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer Bottom */}
            <div className="mt-12 pt-6 border-t border-border/30 text-center">
              <p className="text-xs text-muted-foreground">
                © 2025 Voice CRM Assistant. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
