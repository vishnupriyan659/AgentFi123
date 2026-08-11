import { Compass, ShieldAlert, Zap, CheckCircle2 } from "lucide-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { Badge } from "@/components/ui/badge";

export function ExecutiveInsights() {
  const { snapshot, loading } = useLiveSnapshot();

  const solBal = snapshot?.wallet?.solBalance ?? 0;
  const change24h = snapshot?.market?.change24hPercent ?? 0;
  const txCount = snapshot?.wallet?.recentTransactions?.length ?? 0;
  const solPrice = snapshot?.market?.solUsdPrice ?? 180;

  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-6 h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2 text-base">
          <Compass className="w-5 h-5 text-primary" />
          Executive Insights
        </h3>
        <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono font-bold">
          CALCULATED FROM LIVE DATA
        </Badge>
      </div>

      <div className="flex-1 space-y-3 font-mono text-xs">
        {/* Most Important Action / Insight */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" /> Wallet Concentration Status
          </div>
          <div className="font-bold text-sm text-foreground">
            {solBal > 0 ? "100% of priced wallet holdings are in SOL" : "Connect Phantom to evaluate wallet concentration"}
          </div>
          <div className="text-muted-foreground text-[11px]">
            {solBal > 0 ? `Current balance: ${solBal.toFixed(4)} SOL ($${(solBal * solPrice).toFixed(2)} reference value).` : "No active Devnet SOL balance."}
          </div>
        </div>

        {/* Biggest Risk */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-destructive font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Primary Risk Factor
          </div>
          <div className="font-bold text-sm text-foreground">
            {solBal < 0.05 ? "Low Devnet Fee Reserve" : "Single Asset Volatility Exposure"}
          </div>
          <div className="text-muted-foreground text-[11px]">
            {solBal < 0.05
              ? `Balance is ${solBal.toFixed(4)} SOL. Maintain reserve for network fees.`
              : `SOL 24h market price change is ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%.`}
          </div>
        </div>

        {/* Activity & Protocol Status */}
        <div className="bg-teal/10 border border-teal/20 rounded-xl p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-teal font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Devnet Activity & Strategy Status
          </div>
          <div className="font-bold text-sm text-foreground">
            {txCount > 0 ? `${txCount} recent Devnet signatures loaded` : "No recent Devnet transactions"}
          </div>
          <div className="text-muted-foreground text-[11px]">
            No verified live Devnet strategy available. Market info is educational only.
          </div>
        </div>
      </div>
    </div>
  );
}
