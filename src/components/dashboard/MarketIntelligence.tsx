import { Globe2, Activity, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { Badge } from "@/components/ui/badge";

function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

export function MarketIntelligence() {
  const { snapshot, loading } = useLiveSnapshot();

  const priceUsd = snapshot?.market?.solUsdPrice ?? null;
  const change24h = snapshot?.market?.change24hPercent ?? 0;
  const high24h = snapshot?.market?.high24h ?? null;
  const low24h = snapshot?.market?.low24h ?? null;
  const realizedVol = snapshot?.market?.realizedVolatility ?? null;

  const isPositive = change24h >= 0;

  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-6 h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2 text-base">
          <Globe2 className="w-5 h-5 text-primary" />
          Live Market Intelligence
        </h3>
        <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[10px] uppercase font-mono font-bold">
          LIVE MARKET — Source: CoinGecko
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono block">24h Trajectory</span>
          <div className={`flex items-center gap-1 font-bold font-mono text-lg ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPositive ? "+" : ""}{change24h.toFixed(2)}%
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">Spot: {formatUsd(priceUsd)}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono block">Realized Volatility</span>
          <div className="flex items-center gap-1 text-teal font-bold font-mono text-lg">
            <Activity className="w-4 h-4" />
            {realizedVol !== null ? `${realizedVol.toFixed(2)}%` : "Calculating..."}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">Std dev of log returns</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal" /> Timeframe Price Boundaries
          </span>
          <div className="flex justify-between text-foreground pt-1">
            <span>Session High: <strong>{formatUsd(high24h)}</strong></span>
            <span>Session Low: <strong>{formatUsd(low24h)}</strong></span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 text-xs font-mono text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wider text-teal font-bold block mb-1">Observation Notice</span>
        <p className="text-[11px] text-foreground/80 italic">
          "Market metrics are derived strictly from live CoinGecko feed data. Information is educational and is not financial advice."
        </p>
      </div>
    </div>
  );
}
