import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Compass, ShieldAlert, Zap, RefreshCw, Wallet, 
  TrendingUp, TrendingDown, ShieldCheck 
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { calculateLiveRiskProfile } from "@/services/riskEngine";
import { DataTruthLegend } from "@/components/common/DataTruthLegend";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

function truncate(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function ExecutiveInsightsPageContent() {
  const { connected, publicKey } = useWallet();
  const { snapshot, loading, isStale, refresh } = useLiveSnapshot();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const risk = calculateLiveRiskProfile(snapshot);

  const isWalletConnected = Boolean(connected && publicKey);
  const solBal = isWalletConnected ? (snapshot?.wallet?.solBalance ?? null) : null;
  const balanceStatus = snapshot?.wallet?.balanceStatus ?? (isWalletConnected ? (solBal === 0 ? "zero" : "funded") : "disconnected");
  const solPrice = snapshot?.market?.solUsdPrice ?? null;
  const change24h = snapshot?.market?.change24hPercent ?? 0;
  const mainnetValueRef = isWalletConnected && solBal !== null && solPrice !== null ? solBal * solPrice : null;

  const txs = isWalletConnected ? (snapshot?.wallet?.recentTransactions ?? []) : [];
  const failedTxsCount = txs.filter((t) => t.status === "failed").length;
  const tokenCount = isWalletConnected ? (snapshot?.wallet?.tokenAccounts?.length ?? 0) : 0;

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Executive Insights</h1>
            <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal font-mono font-bold text-xs uppercase px-2.5 py-0.5">
              CALCULATED FROM LIVE SNAPSHOT
            </Badge>
            {isStale && (
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning font-mono text-xs">
                STALE DATA
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            High-level executive telemetry derived strictly from live Devnet RPC and CoinGecko market feeds.
          </p>
        </div>

        <Button
          onClick={handleManualRefresh}
          disabled={loading || isRefreshing}
          variant="outline"
          className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh Live Snapshot
        </Button>
      </div>

      <DataTruthLegend />

      {/* Valuation Notice */}
      <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-xs font-mono text-teal flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-teal" />
        <span>Devnet balances are test funds and have no real monetary value. USD figures are mainnet market-price references only.</span>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* Connected Wallet */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wallet Address
            </CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-foreground truncate">
              {isWalletConnected && publicKey ? truncate(publicKey.toBase58()) : "Disconnected"}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1">
              {isWalletConnected ? "Network: Solana Devnet" : "Connect Phantom extension"}
            </div>
          </CardContent>
        </Card>

        {/* Live Devnet SOL */}
        <Card className="glass-card border-teal/20 bg-teal/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Devnet SOL
            </CardTitle>
            <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] font-mono">
              {isWalletConnected ? "DEVNET TEST DATA" : "DISCONNECTED"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-teal">
              {!isWalletConnected
                ? "Connect Phantom"
                : solBal !== null
                ? `${solBal.toFixed(4)} SOL`
                : "RPC Loading..."}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground mt-1">
              {isWalletConnected ? "Verified on Devnet RPC" : "Connect Phantom to load live wallet data"}
            </div>
          </CardContent>
        </Card>

        {/* Mainnet Market Reference Price */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SOL Spot Price
            </CardTitle>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[10px] font-mono">
              LIVE MARKET
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {formatUsd(solPrice)}
            </div>
            <div className={`text-[11px] font-mono mt-1 flex items-center gap-1 ${change24h >= 0 ? "text-success" : "text-destructive"}`}>
              {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}% (24h CoinGecko)
            </div>
          </CardContent>
        </Card>

        {/* Reference Portfolio Value */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reference Valuation
            </CardTitle>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-mono">
              CALCULATED
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {isWalletConnected ? formatUsd(mainnetValueRef) : "N/A"}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              {isWalletConnected ? "Not real monetary value" : "Connect Phantom wallet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculated Risk Breakdown Card */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base">Calculated Risk Profile</CardTitle>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning font-mono text-xs">
                {risk.hasEnoughData ? `${risk.riskCategory} (${risk.totalRiskScore}/100)` : "Not Calculated"}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Transparent component breakdown derived from live wallet fee reserves, token accounts, and market volatility.
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-muted-foreground">CALCULATED</span>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase text-muted-foreground block">Concentration</span>
              <span className="text-base font-bold text-foreground">{risk.hasEnoughData ? `${risk.concentrationScore}/30` : "N/A"}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase text-muted-foreground block">Volatility</span>
              <span className="text-base font-bold text-foreground">{risk.hasEnoughData ? `${risk.volatilityScore}/25` : "N/A"}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase text-muted-foreground block">Diversification</span>
              <span className="text-base font-bold text-foreground">{risk.hasEnoughData ? `${risk.diversificationScore}/20` : "N/A"}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase text-muted-foreground block">Fee Reserve</span>
              <span className="text-base font-bold text-foreground">{risk.hasEnoughData ? `${risk.feeReserveScore}/15` : "N/A"}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase text-muted-foreground block">Failed Txs</span>
              <span className="text-base font-bold text-foreground">{risk.hasEnoughData ? `${risk.failedTxScore}/10` : "N/A"}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-black/30 font-mono text-xs text-muted-foreground">
            <strong>Formula Explanation:</strong> {risk.formulaExplanation}
          </div>
        </CardContent>
      </Card>

      {/* Primary Observations & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Key Executive Observations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <span className="font-bold text-foreground block">Asset Concentration</span>
              <span className="text-muted-foreground">
                {!isWalletConnected
                  ? "Connect Phantom to load live wallet data."
                  : solBal === 0
                  ? "Not enough holdings data (0.0000 SOL balance). Obtain Devnet test funds."
                  : tokenCount === 0
                  ? "100% of visible wallet holdings are concentrated in native SOL."
                  : `${tokenCount + 1} distinct asset holdings detected.`}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <span className="font-bold text-foreground block">Recent Signature History</span>
              <span className="text-muted-foreground">
                {isWalletConnected
                  ? `${txs.length} total signatures retrieved. ${failedTxsCount} failed signature(s) detected in recent history.`
                  : "Connect Phantom wallet to view signature history."}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-warning" /> Safety & Execution Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <span className="font-bold text-foreground block">Supported Execution</span>
              <span className="text-muted-foreground">
                Only native Devnet SOL transfer is executable via Transfer Agent. Staking, swaps, and lending are disabled on Devnet.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <span className="font-bold text-foreground block">Educational Disclaimer</span>
              <span className="text-muted-foreground">
                Market information is educational only and is not financial advice.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ExecutiveInsightsPage() {
  return (
    <ErrorBoundary fallbackTitle="Executive Insights Error">
      <ExecutiveInsightsPageContent />
    </ErrorBoundary>
  );
}
