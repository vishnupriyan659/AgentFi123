import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, RefreshCw, AlertCircle, Clock, ShieldCheck, Database
} from "lucide-react";
import type { SolHeadlineMarketData } from "@/services/marketDataService";

interface LiveSolMarketCardProps {
  data: SolHeadlineMarketData | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  onRefresh: () => void;
}

function formatUsd(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatCompactUsd(val: number): string {
  if (val >= 1e9) {
    return `$${(val / 1e9).toFixed(2)}B`;
  }
  if (val >= 1e6) {
    return `$${(val / 1e6).toFixed(2)}M`;
  }
  return formatUsd(val);
}

export const LiveSolMarketCard: React.FC<LiveSolMarketCardProps> = ({
  data,
  loading,
  error,
  isStale,
  onRefresh,
}) => {
  if (error && !data) {
    return (
      <Card className="glass-card border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-bold text-base font-display">Live market data unavailable</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2 border-destructive/30 hover:bg-destructive/10 text-destructive rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Retry Connection
            </Button>
            <span className="text-xs font-mono text-muted-foreground">Source: CoinGecko API</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-8 bg-white/10 rounded w-1/2" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isPositive = data.priceChange24h > 0;
  const isNegative = data.priceChange24h < 0;

  const calculatedMovementText = isPositive
    ? "Positive 24h movement"
    : isNegative
    ? "Negative 24h movement"
    : "No significant movement";

  const updatedTimeStr = new Date(data.lastUpdatedAt).toLocaleTimeString();

  return (
    <Card className="glass-card border-white/10 relative overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          <CardTitle className="text-lg font-bold font-display flex items-center gap-2">
            <span>SOL / USD</span>
            <span className="text-xs font-normal text-muted-foreground">Solana Native Token</span>
          </CardTitle>
          <span className="bg-success/10 text-success border border-success/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            LIVE MARKET DATA — refreshed every 30 seconds
          </span>
          {isStale && (
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" /> STALE DATA — Last verified at {updatedTimeStr}
            </span>
          )}
        </div>

        <Button
          onClick={onRefresh}
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-lg"
          title="Refresh Live Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Price Row */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="text-4xl font-extrabold tracking-tight font-mono text-foreground">
              {formatUsd(data.priceUsd)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  isPositive
                    ? "bg-success/10 text-success border border-success/20"
                    : isNegative
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-white/10 text-muted-foreground border border-white/10"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : isNegative ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                {isPositive ? "+" : ""}
                {data.priceChange24h.toFixed(2)}% (24h)
              </span>

              {/* Calculated Movement Badge */}
              <span className="bg-teal/10 text-teal border border-teal/20 text-[10px] px-2 py-1 rounded-lg font-mono font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                CALCULATED: {calculatedMovementText}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs font-mono text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3 text-primary" />
              <span>Provider: <strong className="text-foreground">{data.provider}</strong></span>
            </div>
            <div>Updated: {updatedTimeStr}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">24h Volume</span>
            <div className="text-base font-mono font-bold text-foreground">
              {formatCompactUsd(data.volume24h)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Market Cap</span>
            <div className="text-base font-mono font-bold text-foreground">
              {formatCompactUsd(data.marketCap)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Asset</span>
            <div className="text-base font-mono font-bold text-foreground">SOL / Solana</div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
            <div className="text-base font-mono font-bold text-success flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />
              Verified Feed
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
