
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Wallet, ArrowUpRight, ArrowDownRight, ArrowRightLeft, 
  ExternalLink, RefreshCw, CheckCircle2, ShieldCheck, Activity, AlertCircle, Sparkles 
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSolBalance } from "@/hooks/useSolBalance";
import { useTransactions } from "@/hooks/useTransactions";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { DataTruthLegend } from "@/components/common/DataTruthLegend";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const truncate = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

export function DashboardContent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { balance, loading: balanceLoading } = useSolBalance();
  const { transactions, loading: txLoading, refresh } = useTransactions();
  const { status: backendStatus, isConnected, isOffline } = useBackendHealth();

  const [displayName, setDisplayName] = useState<string>(() => {
    const saved = localStorage.getItem("agentfi_display_name");
    return saved && saved.trim() ? saved.trim() : "AgentFi Developer";
  });

  useEffect(() => {
    const syncName = () => {
      const saved = localStorage.getItem("agentfi_display_name");
      setDisplayName(saved && saved.trim() ? saved.trim() : "AgentFi Developer");
    };

    window.addEventListener("agentfi_name_changed", syncName);
    window.addEventListener("storage", syncName);

    return () => {
      window.removeEventListener("agentfi_name_changed", syncName);
      window.removeEventListener("storage", syncName);
    };
  }, []);

  const addressStr = publicKey?.toBase58() ?? "";

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel border border-primary/20 rounded-3xl p-6 md:p-8 bg-gradient-to-r from-primary/10 via-background to-background relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary font-mono">AgentFi OS v2.0</span>
              <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono">
                Solana Devnet
              </Badge>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Welcome back, <span className="gradient-text">{displayName}</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Autonomous financial AI operating system for Solana Devnet transfers, intent parsing, and risk verification.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link to="/agents">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-primary text-white hover:opacity-90 glow-btn rounded-xl h-12 px-6 shadow-lg shadow-primary/25 font-semibold text-base">
                <Bot className="w-5 h-5" />
                Send Devnet SOL
              </Button>
            </Link>
            {!connected && (
              <Button size="lg" variant="outline" onClick={() => setVisible(true)} className="w-full sm:w-auto gap-2 glass-panel border-white/10 hover:bg-white/5 rounded-xl h-12 px-6">
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Global Data Truth Legend */}
      <DataTruthLegend />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connected Wallet */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <span>Connected Wallet</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="font-mono text-lg font-bold truncate text-foreground">
              {connected && addressStr ? truncate(addressStr) : "Disconnected"}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              {connected ? "Devnet Fee Payer Active" : "Connect Phantom to start"}
            </div>
          </CardContent>
        </Card>

        {/* Live Devnet SOL Balance */}
        <Card className="glass-card border-teal/20 bg-teal/5">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <span>Live Devnet SOL</span>
              <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
            </div>
            <div className="font-mono text-2xl font-bold text-teal">
              {balanceLoading ? (
                <span className="text-sm animate-pulse">Loading balance...</span>
              ) : balance !== null ? (
                `${balance.toFixed(4)} SOL`
              ) : (
                "0.0000 SOL"
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-teal" /> Verified on Solana RPC
            </div>
          </CardContent>
        </Card>

        {/* Backend & Cluster Status */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <span>Backend & Cluster</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div className="font-mono text-lg font-bold text-foreground capitalize flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOffline
                    ? "bg-destructive"
                    : isConnected
                    ? "bg-success animate-pulse"
                    : "bg-warning animate-pulse"
                }`}
              />
              {isOffline ? "Backend Offline" : isConnected ? "Online" : "Connecting..."}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Express Port 5000 · Devnet RPC Active
            </div>
          </CardContent>
        </Card>

        {/* Real Risk / Analysis State */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <span>Security & Safety</span>
              <ShieldCheck className="w-4 h-4 text-success" />
            </div>
            <div className="font-mono text-sm font-bold text-success flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Fail-Closed Guards Active
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              0.05 SOL Cap · On-Curve Check
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Live Devnet Transactions (2 Cols) */}
        <Card className="glass-card border-white/10 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5">
            <div>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Recent Live Devnet Transactions
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time confirmed signatures from connected wallet
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={txLoading || !publicKey} className="gap-1.5 h-8 text-xs font-mono">
              <RefreshCw className={`w-3.5 h-3.5 ${txLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!publicKey ? (
              <div className="p-8 text-center text-xs font-mono text-muted-foreground">
                Connect Phantom wallet to view live Devnet transactions.
              </div>
            ) : txLoading ? (
              <div className="p-8 text-center text-xs font-mono text-muted-foreground animate-pulse">
                Fetching confirmed Devnet signatures...
              </div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-white/5">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {tx.direction === "received" ? <ArrowDownRight className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{tx.intent || "Native SOL Transfer"}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {tx.signature.slice(0, 10)}...{tx.signature.slice(-10)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <div className="text-sm font-bold text-foreground">{tx.fromAmount.toFixed(4)} SOL</div>
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-muted-foreground">
                No recent Devnet transactions found for this wallet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Launch & System Status (1 Col) */}
        <Card className="glass-card border-white/10 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Devnet Agent Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 flex-1">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Devnet Transfer Agent
              </div>
              <p className="text-xs text-muted-foreground">
                Parse natural language intents, run backend Zod validation, RPC simulations, and submit verified SOL transfers.
              </p>
              <Link to="/agents" className="block pt-2">
                <Button className="w-full gap-2 bg-primary text-white hover:bg-primary/90 h-10 font-semibold text-xs">
                  Open Transfer Agent <ArrowRightLeft className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal" />
                Security Verification
              </div>
              <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between"><span>Solana Cluster:</span><span className="text-teal">Devnet</span></div>
                <div className="flex justify-between"><span>Max Transfer Cap:</span><span>0.05 SOL</span></div>
                <div className="flex justify-between"><span>RPC Simulation:</span><span className="text-success">Pre-Send</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence & Executive Tools Section */}
      <Card className="glass-card border-white/10 mt-6">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Intelligence & Executive Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
            <Link to="/executive-insights" className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all space-y-1.5 block">
              <span className="font-bold text-foreground block">Executive Insights</span>
              <span className="text-[11px] text-muted-foreground block">Risk & concentration telemetry</span>
            </Link>

            <Link to="/enterprise-reports" className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all space-y-1.5 block">
              <span className="font-bold text-foreground block">Enterprise Reports</span>
              <span className="text-[11px] text-muted-foreground block">Printable audit snapshots</span>
            </Link>

            <Link to="/ai-copilot" className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all space-y-1.5 block">
              <span className="font-bold text-teal block">AI Copilot</span>
              <span className="text-[11px] text-muted-foreground block">Grounded AI analysis</span>
            </Link>

            <Link to="/agent-debate" className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all space-y-1.5 block">
              <span className="font-bold text-foreground block">Agent Debate</span>
              <span className="text-[11px] text-muted-foreground block">4-Agent consensus panel</span>
            </Link>

            <Link to="/recommendations" className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all space-y-1.5 block">
              <span className="font-bold text-foreground block">Recommendations</span>
              <span className="text-[11px] text-muted-foreground block">Rule-based recommendations</span>
            </Link>

            <Link to="/swap-lab" className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all space-y-1.5 block">
              <span className="font-bold text-warning block">Swap Lab</span>
              <span className="text-[11px] text-muted-foreground block">Simulation only dry-runs</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary fallbackTitle="Dashboard Render Error">
      <DashboardContent />
    </ErrorBoundary>
  );
}
