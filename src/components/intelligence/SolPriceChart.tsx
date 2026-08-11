import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { SolChartPoint } from "@/services/marketDataService";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface SolPriceChartProps {
  chartData: SolChartPoint[];
  loading: boolean;
  priceChange24h?: number;
}

function formatTooltipUsd(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatAxisUsd(val: number): string {
  return `$${val.toFixed(0)}`;
}

export const SolPriceChart: React.FC<SolPriceChartProps> = ({
  chartData,
  loading,
  priceChange24h = 0,
}) => {
  const isPositive = priceChange24h >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const gradientId = isPositive ? "solChartGradientGreen" : "solChartGradientRed";

  if (loading && chartData.length === 0) {
    return (
      <Card className="glass-card mt-6">
        <CardHeader>
          <CardTitle>24-Hour SOL/USD Price Chart</CardTitle>
          <CardDescription>Loading 24h price history from CoinGecko...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4 w-full h-48 bg-white/5 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="glass-card mt-6 border-white/10">
        <CardHeader>
          <CardTitle>24-Hour SOL/USD Price Chart</CardTitle>
          <CardDescription>CoinGecko Market History</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <p className="text-sm font-mono">Live market chart data unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  const minPrice = Math.min(...chartData.map((d) => d.price));
  const maxPrice = Math.max(...chartData.map((d) => d.price));
  const padding = (maxPrice - minPrice) * 0.05 || 1;
  const yDomain: [number, number] = [
    Math.floor(minPrice - padding),
    Math.ceil(maxPrice + padding),
  ];

  return (
    <Card className="glass-card mt-6 border-white/10 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-bold font-display">
              24-Hour SOL/USD Price Chart
            </CardTitle>
            <span className="bg-success/10 text-success border border-success/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              LIVE MARKET CHART
            </span>
          </div>
          <CardDescription className="mt-1">
            Real-time price trajectory from CoinGecko market_chart API
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
          {isPositive ? (
            <span className="text-success flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> 24h Bullish Trend
            </span>
          ) : (
            <span className="text-destructive flex items-center gap-1">
              <TrendingDown className="w-4 h-4" /> 24h Bearish Trend
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="solChartGradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="solChartGradientRed" x1="0" y1="0" x2="0" y2="1">
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
                    const pt = payload[0].payload as SolChartPoint;
                    return (
                      <div className="glass-panel border border-white/20 p-3 rounded-xl shadow-2xl bg-black/90 text-xs font-mono space-y-1">
                        <div className="text-muted-foreground">Time: {pt.timeLabel}</div>
                        <div className="text-foreground font-bold text-sm">
                          Price: {formatTooltipUsd(pt.price)}
                        </div>
                        <div className="text-[10px] text-primary">Source: CoinGecko API</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
