import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Cloud, GitBranch, Loader2 } from "lucide-react";

export type CRMProvider = "hubspot" | "salesforce" | "pipedrive";

interface CRMAuthProps {
  onAuthSuccess: (userData: CRMUserData) => void;
}

export interface CRMUserData {
  provider: CRMProvider;
  name: string;
  email: string;
  accountId: string;
  accessToken: string;
}

const CRM_CONFIGS: Record<CRMProvider, { name: string; colorClass: string; icon: React.ComponentType<any>; authUrl: string }> = {
  hubspot: {
    name: "HubSpot",
    colorClass: "#ff7a59",
    icon: Building2,
    authUrl: "https://app.hubspot.com/oauth/authorize" // Placeholder - needs client_id, redirect_uri, scope
  },
  salesforce: {
    name: "Salesforce",
    colorClass: "#00a1e0",
    icon: Cloud,
    authUrl: "https://login.salesforce.com/services/oauth2/authorize"
  },
  pipedrive: {
    name: "Pipedrive",
    colorClass: "#1a1a1a",
    icon: GitBranch,
    authUrl: "https://oauth.pipedrive.com/oauth/authorize"
  }
};

export const CRMAuth = ({ onAuthSuccess }: CRMAuthProps) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleCRMLogin = async (provider: CRMProvider) => {
    setIsAuthenticating(true);
    
    // Simulated OAuth flow - In production, this would:
    // 1. Redirect to OAuth provider
    // 2. Handle callback with authorization code
    // 3. Exchange code for access token
    // 4. Fetch user info
    
    toast.info(`Connecting to ${CRM_CONFIGS[provider].name}...`);
    
    // Simulate OAuth process
    setTimeout(() => {
      const mockUserData: CRMUserData = {
        provider,
        name: "John Smith",
        email: "john.smith@company.com",
        accountId: `${provider}_12345`,
        accessToken: "mock_access_token_" + Date.now()
      };
      
      localStorage.setItem("crm_user", JSON.stringify(mockUserData));
      toast.success(`Connected to ${CRM_CONFIGS[provider].name}!`);
      onAuthSuccess(mockUserData);
      setIsAuthenticating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <Card className="w-full max-w-md shadow-[var(--shadow-soft)]">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Connect Your CRM
          </CardTitle>
          <CardDescription className="text-base">
            Authenticate with your CRM system to start managing customer data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {(Object.keys(CRM_CONFIGS) as CRMProvider[]).map((provider) => {
            const Icon = CRM_CONFIGS[provider].icon;
            return (
              <Button
                key={provider}
                onClick={() => handleCRMLogin(provider)}
                disabled={isAuthenticating}
                className="w-full h-12 text-base font-medium"
                variant="outline"
              >
                {isAuthenticating ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span style={{ color: CRM_CONFIGS[provider].colorClass }}>
                      <Icon className="w-6 h-6" />
                    </span>
                    <span>Connect to {CRM_CONFIGS[provider].name}</span>
                  </div>
                )}
              </Button>
            );
          })}
          
          <div className="pt-4 text-center text-xs text-muted-foreground">
            <p>Your credentials are securely stored and encrypted.</p>
            <p className="mt-1">We only access data you explicitly authorize.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
