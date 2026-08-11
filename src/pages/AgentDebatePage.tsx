import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface AgentVote {
  agent: string;
  position: "support" | "caution" | "insufficient-data";
  reasoning: string;
  evidence: Array<{ metric: string; value: string; source: string }>;
}

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }
  return "http://localhost:5000/api";
}

export function AgentDebatePageContent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { snapshot, loading, refresh } = useLiveSnapshot();

  const [debates, setDebates] = useState<AgentVote[]>([]);
  const [consensusText, setConsensusText] = useState<string>("2 of 4 agents support this conclusion");
  const [agreementPct, setAgreementPct] = useState<number>(50);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isWalletConnected = Boolean(connected && publicKey);

  const fetchDebate = async () => {
    setIsDebating(true);
    setError(null);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/copilot/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });

      if (!res.ok) {
        throw new Error("Agent debate unavailable because the backend is offline.");
      }

      const data = await res.json();
      setDebates(data.debates || []);
      setConsensusText(data.consensus || "2 of 4 agents support this conclusion");
      setAgreementPct(data.agreementPct || 50);
    } catch (err: any) {
      setError(err?.message || "Agent debate unavailable because the backend is offline.");
    } finally {
      setIsDebating(false);
    }
  };

  useEffect(() => {
    fetchDebate();
  }, [snapshot?.snapshotId, isWalletConnected]);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Agent Debate Engine</h1>
            <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal font-mono font-bold text-xs uppercase">
              RULE-BASED MULTI-AGENT ANALYSIS
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            4 grounded multi-agent perspectives citing live snapshot fields.
          </p>
        </div>

        <Button
          onClick={() => {
            refresh();
            fetchDebate();
          }}
          disabled={loading || isDebating}
          variant="outline"
          className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || isDebating ? "animate-spin" : ""}`} />
          Run Debate Session
        </Button>
      </div>

      {/* Disconnected Notice */}
      {!isWalletConnected && (
        <Card className="glass-card border-warning/30 bg-warning/10 font-mono text-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-warning" />
              <span>Connect Phantom wallet to evaluate wallet-dependent agent perspectives.</span>
            </div>
            <Button size="sm" onClick={() => setVisible(true)} className="bg-primary text-xs h-8 px-3">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Backend Offline Error State */}
      {error && (
        <Card className="glass-card border-destructive/30 bg-destructive/10 font-mono text-xs">
          <CardContent className="p-6 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-destructive mx-auto" />
            <h3 className="font-bold text-destructive text-base">Agent Debate Unavailable</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Debate Consensus Summary */}
      {!error && (
        <Card className="glass-card border-white/10 font-mono text-xs space-y-4">
          <CardHeader className="pb-2 border-b border-white/5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="font-display text-base">Calculated Agent Consensus</CardTitle>
            </div>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs font-bold">
              {consensusText} ({agreementPct}%)
            </Badge>
          </CardHeader>

          <CardContent className="pt-2 space-y-4">
            {/* Progress bar */}
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${agreementPct}%` }} />
            </div>

            {/* Agent Votes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {debates.map((d, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-sm">{d.agent}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        d.position === "support"
                          ? "border-success/30 text-success bg-success/10"
                          : d.position === "caution"
                          ? "border-warning/30 text-warning bg-warning/10"
                          : "border-border text-muted-foreground bg-white/5"
                      }`}
                    >
                      {d.position}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-xs">{d.reasoning}</p>

                  <div className="pt-2 border-t border-white/5 space-y-1">
                    {d.evidence?.map((ev, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="text-teal font-bold">{ev.metric}: {ev.value}</span>
                        <span className="text-muted-foreground">Source: {ev.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AgentDebatePage() {
  return (
    <ErrorBoundary fallbackTitle="Agent Debate Error">
      <AgentDebatePageContent />
    </ErrorBoundary>
  );
}
