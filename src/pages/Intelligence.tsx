import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, RefreshCw, AlertCircle, 
  Wallet, ShieldCheck, Database, CheckCircle2, ArrowUpRight, ArrowDownRight, Info
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolBalance } from "@/hooks/useSolBalance";
import { useTransactions } from "@/hooks/useTransactions";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { SolPriceChart } from "@/components/charts/SolPriceChart";
import { DataTruthLegend } from "@/components/common/DataTruthLegend";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function formatUsd(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

function formatCompactUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) {
    return "N/A";
  }
  if (val >= 1e9) {
    return `$${(val / 1e9).toFixed(2)}B`;
  }
  if (val >= 1e6) {
    return `$${(val / 1e6).toFixed(2)}M`;
  }
  return formatUsd(val);
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Calculates realized volatility (sample standard deviation of period-to-period returns)
 * from an array of historical price points.
 */
function calculateRealizedVolatility(prices: number[]): number | null {
  if (!prices || prices.length < 2) return null;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev));
    }
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    (returns.length > 1 ? returns.length - 1 : 1);
  const stdDev = Math.sqrt(variance);
  return stdDev * 100; // expressed as percentage
}

export function IntelligenceContent() {
  const { connected, publicKey } = useWallet();
  const { balance: devnetSolBalance, loading: balanceLoading } = useSolBalance();
  const { transactions: walletTxs, loading: txLoading } = useTransactions();

  const {
    quote,
    history,
    range,
    setRange,
    loading: marketLoading,
    chartLoading,
    error: marketError,
    lastUpdated,
    isStale,
    refresh: refreshMarket,
  } = useLiveMarketData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await refreshMarket();
    setIsRefreshing(false);
  };

  const updatedTimeStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : null;

  // Derive historical metrics strictly from live CoinGecko prices
  const validPrices = history
    .map((h) => h.priceUsd)
    .filter((p) => typeof p === "number" && Number.isFinite(p));

  const periodHigh = validPrices.length > 0 ? Math.max(...validPrices) : null;
  const periodLow = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const periodSpread =
    periodHigh !== null && periodLow !== null ? periodHigh - periodLow : null;
  const periodSpreadPercent =
    periodSpread !== null && periodLow && periodLow > 0
      ? (periodSpread / periodLow) * 100
      : null;

  const firstPrice = validPrices.length > 0 ? validPrices[0] : null;
  const lastPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : null;
  const periodReturnPercent =
    firstPrice && lastPrice && firstPrice > 0
      ? ((lastPrice - firstPrice) / firstPrice) * 100
      : null;

  const realizedVol = calculateRealizedVolatility(validPrices);

  // Deterministic rule-based market alerts
  const ruleAlerts: Array<{ title: string; description: string; severity: "info" | "warning" | "high" }> = [];

  const change24hVal = quote?.change24h ?? 0;
  if (Math.abs(change24hVal) >= 5.0) {
    ruleAlerts.push({
      title: "High 24h Price Movement Alert",
      description: `SOL moved ${change24hVal >= 0 ? "+" : ""}${change24hVal.toFixed(
        2
      )}% in 24 hours.`,
      severity: "high",
    });
  }

  if (periodSpreadPercent !== null && periodSpreadPercent >= 4.0) {
    ruleAlerts.push({
      title: "High Timeframe Volatility Range Alert",
      description: `Price amplitude reached ${periodSpreadPercent.toFixed(
        2
      )}% across the ${range.toUpperCase()} window.`,
      severity: "warning",
    });
  }

  // Calculate real wallet transfer metrics from Devnet RPC signatures
  const walletAddrStr = publicKey ? publicKey.toBase58() : "";
  const totalSentSol = walletTxs
    .filter((t) => t.direction === "sent")
    .reduce((sum, t) => sum + (t.fromAmount || 0), 0);
  const totalReceivedSol = walletTxs
    .filter((t) => t.direction === "received")
    .reduce((sum, t) => sum + (t.fromAmount || 0), 0);
  const latestTxTimestamp =
    walletTxs.length > 0 && walletTxs[0].timestamp
      ? new Date(walletTxs[0].timestamp).toLocaleTimeString()
      : null;

  // Fail-closed state when error occurs and no quote data exists
  if (marketError && !quote) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Intelligence Core</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time market analytics, CoinGecko price data, and Devnet wallet status.</p>
          </div>
        </div>
        <DataTruthLegend />

        <Card className="glass-card border-destructive/30 bg-destructive/5 text-center p-8">
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg font-mono text-foreground">Live data unavailable</h3>
              <p className="text-xs font-mono text-muted-foreground max-w-md">
                Unable to retrieve live market data from CoinGecko API. Please check your backend connection.
              </p>
            </div>
            <Button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              variant="outline"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 font-mono rounded-xl mt-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> Retry Market Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPositive = change24hVal >= 0;

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Intelligence Core</h1>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success font-mono font-bold text-xs uppercase px-2.5 py-0.5">
              LIVE MARKET
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
              Source: {quote?.provider || "CoinGecko"}
            </Badge>
            {isStale && (
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning font-mono text-xs">
                STALE DATA
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time SOL spot prices, CoinGecko trajectory, rule-based alerts, and connected Devnet wallet stats.
            {updatedTimeStr ? ` · Last updated: ${updatedTimeStr}` : ""}
          </p>
        </div>

        <Button
          onClick={handleRefreshAll}
          disabled={marketLoading || isRefreshing}
          variant="outline"
          className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 shrink-0 rounded-xl"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${marketLoading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh Intelligence
        </Button>
      </div>

      <DataTruthLegend />

      {/* Mandatory Educational Disclaimer Banner */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs font-mono text-blue-300 flex items-center gap-3">
        <Info className="w-5 h-5 shrink-0 text-blue-400" />
        <span>Market information is educational and is not financial advice. All indicators are deterministically calculated from live CoinGecko feed data.</span>
      </div>

      {/* Section A: Live Market Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SOL / USD Price
            </CardTitle>
            <Badge variant="outline" className="border-success/30 text-success text-[10px] uppercase font-bold">
              LIVE
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {marketLoading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Fetching price...</span>
              ) : (
                formatUsd(quote?.priceUsd)
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              CoinGecko Spot Price
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              24h Price Change
            </CardTitle>
            {isPositive ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={`text-2xl font-bold font-mono ${isPositive ? "text-success" : "text-destructive"}`}>
              {marketLoading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Calculating...</span>
              ) : (
                `${isPositive ? "+" : ""}${change24hVal.toFixed(2)}%`
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              {isPositive ? "Upward Trajectory" : "Downward Trajectory"}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              24h Volume
            </CardTitle>
            <Database className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {marketLoading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Loading volume...</span>
              ) : (
                formatCompactUsd(quote?.volume24h)
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Global Exchange Volume
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Market Capitalization
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {marketLoading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Loading cap...</span>
              ) : (
                formatCompactUsd(quote?.marketCap)
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Circulating Token Value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section B: Live 24-Hour Price Chart */}
      <SolPriceChart
        history={history}
        range={range}
        onRangeChange={setRange}
        loading={chartLoading}
        error={marketError}
        priceChange24h={quote?.change24h ?? 0}
        lastUpdated={lastUpdated}
        provider={quote?.provider || "CoinGecko"}
        onRetry={handleRefreshAll}
      />

      {/* Section C: Calculated Market Indicators */}
      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base">Calculated Market Indicators</CardTitle>
              <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono font-bold">
                CALCULATED — derived from live CoinGecko data
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Deterministic mathematical metrics calculated from raw historical price points in the selected {range.toUpperCase()} window.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Period High / Low</div>
            <div className="text-lg font-bold font-mono text-foreground">
              {formatUsd(periodHigh)} / {formatUsd(periodLow)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Spread: {formatUsd(periodSpread)} ({periodSpreadPercent !== null ? `${periodSpreadPercent.toFixed(2)}%` : "N/A"})
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Period Return</div>
            <div className={`text-lg font-bold font-mono ${periodReturnPercent !== null && periodReturnPercent >= 0 ? "text-success" : "text-destructive"}`}>
              {periodReturnPercent !== null ? `${periodReturnPercent >= 0 ? "+" : ""}${periodReturnPercent.toFixed(2)}%` : "N/A"}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">First to last chart point change</div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Realized Volatility</div>
            <div className="text-lg font-bold font-mono text-foreground">
              {realizedVol !== null ? `${realizedVol.toFixed(2)}%` : "N/A"}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">Std dev of log returns</div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Data Sampling</div>
            <div className="text-lg font-bold font-mono text-foreground">
              {validPrices.length} Points
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">Raw CoinGecko feed points</div>
          </div>
        </CardContent>
      </Card>

      {/* Section D & Section E: Deterministic Market Alerts & Connected Devnet Wallet Intelligence */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section D: Rule-Based Market Alerts */}
        <Card className="glass-card border-white/10 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base flex items-center gap-2">
                Deterministic Market Alerts
              </CardTitle>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-[10px] uppercase font-mono font-bold">
                CALCULATED ALERT — not financial advice
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Rule-based alerts evaluated against live CoinGecko metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 flex-1">
            {ruleAlerts.length > 0 ? (
              ruleAlerts.map((alert, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-amber-400/20 bg-amber-400/5 space-y-1">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {alert.title}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{alert.description}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-muted-foreground border border-white/5 rounded-xl bg-white/5 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal" />
                <span>No rule-based market alerts currently triggered.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section E: Connected Wallet Intelligence */}
        <Card className="glass-card border-white/10 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base flex items-center gap-2">
                Connected Wallet Intelligence
              </CardTitle>
              <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono font-bold">
                LIVE DEVNET WALLET DATA — TEST FUNDS ONLY
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Real-time RPC metrics from connected Phantom wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 flex-1">
            {!connected ? (
              <div className="p-6 text-center text-xs font-mono text-muted-foreground border border-white/5 rounded-xl bg-white/5">
                Connect Phantom wallet to view live Devnet RPC balances and transaction metrics.
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-muted-foreground">Connected Address:</span>
                  <span className="font-bold text-foreground">{truncateAddress(walletAddrStr)}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-muted-foreground">Devnet SOL Balance:</span>
                  <span className="font-bold text-teal">
                    {balanceLoading ? "Loading..." : devnetSolBalance !== null ? `${devnetSolBalance.toFixed(4)} SOL` : "0.0000 SOL"}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-muted-foreground">Confirmed Signatures Loaded:</span>
                  <span className="font-bold text-foreground">
                    {txLoading ? "Loading..." : `${walletTxs.length} transactions`}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-muted-foreground">Native SOL Sent / Received:</span>
                  <span className="font-bold text-foreground">
                    -{totalSentSol.toFixed(4)} / +{totalReceivedSol.toFixed(4)} SOL
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section F: Strategy & Yield Honesty */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">Devnet Strategy Status</CardTitle>
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px] uppercase font-mono font-bold">
              DEVNET TRUTHFULNESS
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal" />
              No verified live Devnet strategy available.
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              AgentFi operates strictly on Solana Devnet. Mainnet DeFi protocols (such as Kamino, MarginFi, and Orca mainnet pools) are not connected or claimed as executable strategies on Devnet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Intelligence() {
  return (
    <ErrorBoundary fallbackTitle="Intelligence Page Render Error">
      <IntelligenceContent />
    </ErrorBoundary>
  );
}
