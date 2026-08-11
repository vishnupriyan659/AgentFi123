import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { SolHistoryPoint } from "@/hooks/useLiveMarketData";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";

interface SolPriceChartProps {
  history: SolHistoryPoint[];
  range: "1h" | "24h" | "7d";
  onRangeChange: (r: "1h" | "24h" | "7d") => void;
  loading: boolean;
  error: string | null;
  priceChange24h?: number;
  lastUpdated?: number | null;
  provider?: string;
  onRetry?: () => void;
}

function formatTooltipUsd(val: number): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatAxisUsd(val: number): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return "";
  return `$${val.toFixed(0)}`;
}

export const SolPriceChart: React.FC<SolPriceChartProps> = ({
  history,
  range,
  onRangeChange,
  loading,
  error,
  priceChange24h = 0,
  lastUpdated,
  provider = "CoinGecko",
  onRetry,
}) => {
  const isPositive = priceChange24h >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = isPositive ? "solChartGradGreen" : "solChartGradRed";

  const updatedTimeStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : null;

  if (error && history.length === 0) {
    return (
      <Card className="glass-card mt-6 border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-bold font-display">SOL/USD Live Market Chart</CardTitle>
            <span className="bg-destructive/10 text-destructive border border-destructive/20 text-xs px-2.5 py-1 rounded-full font-mono font-bold">
              LIVE MARKET
            </span>
          </div>
          <CardDescription>CoinGecko Market Data</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center gap-3 text-destructive">
          <AlertCircle className="w-8 h-8 shrink-0" />
          <p className="text-sm font-mono font-semibold">Live market data unavailable</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/30 hover:bg-destructive/10 text-destructive rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Chart Loading
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading && history.length === 0) {
    return (
      <Card className="glass-card mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-bold font-display">SOL/USD Live Market Chart</CardTitle>
          <CardDescription>Fetching real-time market trajectory...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4 w-full h-48 bg-white/5 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const validPrices = history.map((d) => d.priceUsd).filter((p) => typeof p === "number" && Number.isFinite(p));
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 100;
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 200;
  const padding = (maxPrice - minPrice) * 0.05 || 1;
  const yDomain: [number, number] = [
    Math.floor(minPrice - padding),
    Math.ceil(maxPrice + padding),
  ];

  return (
    <Card className="glass-card mt-6 border-white/10 overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg font-bold font-display">
              SOL/USD Live Market Chart
            </CardTitle>
            <span className="bg-success/10 text-success border border-success/20 text-xs px-2.5 py-1 rounded-full font-mono font-bold">
              LIVE MARKET
            </span>
          </div>
          <CardDescription className="mt-1">
            Provider: <strong className="text-foreground">{provider}</strong>
            {updatedTimeStr ? ` · Updated ${updatedTimeStr}` : ""}
          </CardDescription>
        </div>

        {/* Range Controls */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
          {(["1h", "24h", "7d"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => onRangeChange(r)}
              className={`h-7 px-3 text-xs font-mono rounded-lg ${
                range === r
                  ? "bg-primary text-white font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {history.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-mono text-xs">
            Live market data unavailable
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="solChartGradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="solChartGradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="timeLabel"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={yDomain}
                  tickFormatter={formatAxisUsd}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload as SolHistoryPoint;
                      return (
                        <div className="glass-panel border border-white/20 p-3 rounded-xl shadow-2xl bg-black/90 text-xs font-mono space-y-1">
                          <div className="text-muted-foreground">Time: {pt.timeLabel}</div>
                          <div className="text-foreground font-bold text-sm">
                            Price: {formatTooltipUsd(pt.priceUsd)}
                          </div>
                          <div className="text-[10px] text-primary">Provider: {provider}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="priceUsd"
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
