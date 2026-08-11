import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, RefreshCw, AlertCircle, 
  DollarSign, Activity, BarChart3, Layers, CheckCircle2, ShieldCheck 
} from "lucide-react";
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

function formatLargeUsd(val: number | null | undefined): string {
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

export function MarketRadarContent() {
  const {
    quote,
    history,
    range,
    setRange,
    loading,
    chartLoading,
    error,
    lastUpdated,
    isStale,
    refresh,
  } = useLiveMarketData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const updatedTimeStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : null;

  // Derive Session Stats from live history points (CALCULATED FROM LIVE DATA)
  const validPrices = history
    .map((h) => h.priceUsd)
    .filter((p) => typeof p === "number" && Number.isFinite(p));

  const sessionHigh = validPrices.length > 0 ? Math.max(...validPrices) : null;
  const sessionLow = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const priceSpread =
    sessionHigh !== null && sessionLow !== null ? sessionHigh - sessionLow : null;
  const spreadPercent =
    priceSpread !== null && sessionLow && sessionLow > 0
      ? (priceSpread / sessionLow) * 100
      : null;

  // Fail-closed state when error occurs and no quote data exists
  if (error && !quote) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Market Radar</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time verification of Solana market data.</p>
          </div>
        </div>
        <DataTruthLegend />

        <Card className="glass-card border-destructive/30 bg-destructive/5 text-center p-8">
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg font-mono text-foreground">Live market data unavailable</h3>
              <p className="text-xs font-mono text-muted-foreground max-w-md">
                Unable to reach the live CoinGecko market proxy endpoint. Please check your backend connection.
              </p>
            </div>
            <Button
              onClick={handleManualRefresh}
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

  const isPositive = (quote?.change24h ?? 0) >= 0;

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Market Radar</h1>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success font-mono font-bold text-xs uppercase px-2.5 py-0.5">
              LIVE MARKET
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
              Source: {quote?.provider || "CoinGecko"}
            </Badge>
            {isStale && (
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning font-mono text-xs">
                Data Stale
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time SOL/USD spot prices, trading volume, and market trajectories.
            {updatedTimeStr ? ` · Last updated: ${updatedTimeStr}` : ""}
          </p>
        </div>

        <Button
          onClick={handleManualRefresh}
          disabled={loading || isRefreshing}
          variant="outline"
          className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 shrink-0 rounded-xl"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh Market Data
        </Button>
      </div>

      <DataTruthLegend />

      {/* Primary Market Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SOL/USD Spot Price */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SOL / USD Price
            </CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {loading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Fetching price...</span>
              ) : (
                formatUsd(quote?.priceUsd)
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-muted-foreground">Spot Rate</span>
              <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-[10px] uppercase font-bold py-0">
                LIVE
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 24h Change */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              24h Price Change
            </CardTitle>
            {isPositive ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={`text-2xl font-bold font-mono ${isPositive ? "text-success" : "text-destructive"}`}>
              {loading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Calculating...</span>
              ) : (
                `${isPositive ? "+" : ""}${(quote?.change24h ?? 0).toFixed(2)}%`
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              {isPositive ? "Upward Trajectory" : "Downward Trajectory"}
            </div>
          </CardContent>
        </Card>

        {/* 24h Trading Volume */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              24h Volume
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {loading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Loading volume...</span>
              ) : (
                formatLargeUsd(quote?.volume24h)
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Global 24h Exchange Volume
            </div>
          </CardContent>
        </Card>

        {/* Market Cap */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Market Capitalization
            </CardTitle>
            <Layers className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {loading && !quote ? (
                <span className="text-sm animate-pulse text-muted-foreground">Loading cap...</span>
              ) : (
                formatLargeUsd(quote?.marketCap)
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Circulating SOL Value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Live Price Chart */}
      <SolPriceChart
        history={history}
        range={range}
        onRangeChange={setRange}
        loading={chartLoading}
        error={error}
        priceChange24h={quote?.change24h ?? 0}
        lastUpdated={lastUpdated}
        provider={quote?.provider || "CoinGecko"}
        onRetry={handleManualRefresh}
      />

      {/* Derived Analytics from Live Data */}
      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base">Timeframe Market Analytics</CardTitle>
              <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono font-bold">
                CALCULATED FROM LIVE DATA
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Factual statistical boundaries calculated directly from live price history ({range.toUpperCase()} window).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Session High ({range.toUpperCase()})</div>
            <div className="text-lg font-bold font-mono text-success">
              {formatUsd(sessionHigh)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">Peak observed price</div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Session Low ({range.toUpperCase()})</div>
            <div className="text-lg font-bold font-mono text-destructive">
              {formatUsd(sessionLow)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">Floor observed price</div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Price Spread</div>
            <div className="text-lg font-bold font-mono text-foreground">
              {formatUsd(priceSpread)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {spreadPercent !== null ? `${spreadPercent.toFixed(2)}% range amplitude` : "Calculating spread..."}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Observation</div>
            <div className="text-xs font-semibold font-mono text-foreground flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal shrink-0" /> Standard Volatility
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Trading within bounds on Solana Devnet.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarketRadar() {
  return (
    <ErrorBoundary fallbackTitle="Market Radar Render Error">
      <MarketRadarContent />
    </ErrorBoundary>
  );
}
