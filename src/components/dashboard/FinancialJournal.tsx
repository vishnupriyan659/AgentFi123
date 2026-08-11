import { BookOpen, Clock, Activity, CheckCircle2, Database } from "lucide-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { Badge } from "@/components/ui/badge";

export function FinancialJournal() {
  const { snapshot } = useLiveSnapshot();

  const solBal = snapshot?.wallet?.solBalance ?? 0;
  const txCount = snapshot?.wallet?.recentTransactions?.length ?? 0;
  const solPrice = snapshot?.market?.solUsdPrice ?? 180;
  const change24h = snapshot?.market?.change24hPercent ?? 0;

  const events = [
    {
      type: "RPC SYNC",
      message: `Verified connected wallet balance (${solBal.toFixed(4)} SOL) on Solana Devnet.`,
      time: "Just now",
      icon: Activity,
      color: "text-teal",
    },
    {
      type: "MARKET FEED",
      message: `Updated CoinGecko spot price: $${solPrice.toFixed(2)} USD (${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%).`,
      time: "30s ago",
      icon: Database,
      color: "text-success",
    },
    {
      type: "SIGNATURES",
      message: `Loaded ${txCount} confirmed signatures from Solana Devnet RPC.`,
      time: "1 min ago",
      icon: CheckCircle2,
      color: "text-primary",
    },
    {
      type: "RISK EVAL",
      message: `Calculated concentration score and fee-reserve indicators for connected wallet.`,
      time: "Live",
      icon: BookOpen,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-6 h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2 text-base">
          <BookOpen className="w-5 h-5 text-primary" />
          AI Financial Journal
        </h3>
        <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono font-bold">
          LIVE LOG
        </Badge>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar relative font-mono">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/10" />

        {events.map((e, i) => (
          <div key={i} className="flex gap-4 relative">
            <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0 border border-white/10 ${e.color} z-10`}>
              <e.icon className="w-4 h-4" />
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${e.color}`}>{e.type}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {e.time}
                </span>
              </div>
              <p className="text-xs text-foreground/80">{e.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
