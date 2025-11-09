import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface HubSpotPanelProps {
  proposedActions: any;
  data: any;
  onConfirm: () => void;
  onReject: () => void;
}

export const HubSpotPanel = ({ proposedActions, data, onConfirm, onReject }: HubSpotPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    toast.info("Executing CRM actions... (Connect your Python backend here)");
    
    // This is where you'll integrate with your Python backend
    // Example API call structure:
    // const response = await fetch("YOUR_PYTHON_BACKEND_URL/hubspot/sync", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ actions: proposedActions }),
    // });
    
    setTimeout(() => {
      setIsLoading(false);
      onConfirm();
      toast.success("CRM actions executed successfully");
    }, 1500);
  };

  const handleReject = () => {
    onReject();
    toast.info("CRM actions cancelled");
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg h-full">
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              {proposedActions ? "Proposed CRM Actions" : "CRM Status"}
            </h3>
          </div>
          {proposedActions && (
            <div className="flex gap-2">
              <Button 
                onClick={handleReject}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={isLoading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1 rounded-md border border-border/50 bg-muted/30 p-4">
          {proposedActions ? (
            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent/20 rounded-md p-4">
                <p className="text-base font-semibold text-foreground mb-4">The following was understood by the system:</p>
                
                {proposedActions}
              </div>
            </div>
          ) : data ? (
            <div className="space-y-3">
              <div className="bg-primary/10 border border-primary/20 rounded-md p-4 mb-3">
                <p className="text-base font-semibold text-foreground">✓ CRM Updated Successfully</p>
              </div>
              <div className="space-y-2 text-sm text-foreground">
                <p>Contact <span className="font-medium">{data.contact?.firstname} {data.contact?.lastname}</span> has been updated.</p>
                {data.task_created && (
                  <p>Task "<span className="font-medium">{data.task_created.title}</span>" has been created.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">Last sync: {new Date(data.lastSync).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground italic">
                Process your audio recording to see proposed CRM actions...
              </p>
            </div>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Backend Integration Point: POST actions to your Python API at /crm/sync
        </p>
      </div>
    </Card>
  );
};
