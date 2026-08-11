import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User } from "lucide-react";

export default function Settings() {
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("agentfi_display_name") || "");

  const handleSaveName = () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      handleClearName();
      return;
    }
    localStorage.setItem("agentfi_display_name", trimmed);
    setDisplayName(trimmed);
    window.dispatchEvent(new Event("agentfi_name_changed"));
    toast.success("Profile Name Saved", {
      description: `Display name updated to "${trimmed}".`
    });
  };

  const handleClearName = () => {
    localStorage.removeItem("agentfi_display_name");
    setDisplayName("");
    window.dispatchEvent(new Event("agentfi_name_changed"));
    toast.info("Profile Name Cleared", {
      description: "Display name reset to default address or generic greeting."
    });
  };

  return (
    <div className="container max-w-4xl py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">System Settings</h1>
            <span className="font-mono text-warning font-semibold bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20 text-xs">
              SOLANA DEVNET — TEST FUNDS ONLY
            </span>
          </div>
          <p className="text-muted-foreground mt-2">Manage your AgentFi operating system configuration.</p>
        </div>

        {/* AgentFi Display Name Section */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              AgentFi Display Name
            </CardTitle>
            <CardDescription>
              Set your personal profile name displayed across the AgentFi Command Center.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter profile name (e.g. Vishnupriyan)"
                maxLength={40}
                className="bg-black/20 border-white/10 text-foreground focus:border-primary font-medium"
              />
              <p className="text-xs text-muted-foreground">
                This is your AgentFi profile name. It is not retrieved from Phantom.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveName} className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl">
                Save Display Name
              </Button>
              <Button onClick={handleClearName} variant="outline" className="border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground rounded-xl">
                Clear Name
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>RPC Configuration</CardTitle>
              <CardDescription>Manage your Solana RPC endpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Primary Endpoint</p>
                  <p className="text-sm font-mono mt-1 text-primary break-all">{rpcUrl}</p>
                </div>
                <Button onClick={() => toast.info("Settings Locked", { description: "RPC settings are locked in demo mode." })} variant="secondary" className="w-full text-white/70 hover:text-white">Update RPC URL</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>AI Preferences</CardTitle>
              <CardDescription>Configure the underlying LLM engine.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Model</p>
                  <p className="text-sm font-mono mt-1 text-primary">Deterministic Provider (Mock)</p>
                </div>
                <Button onClick={() => toast.info("Settings Locked", { description: "AI Model preferences are locked in demo mode." })} variant="secondary" className="w-full text-white/70 hover:text-white">Change Model</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
