import { Radar, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function OpportunityRadar() {
  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <h3 className="font-display font-bold text-base">Opportunity Radar</h3>
        </div>
        <Badge variant="outline" className="border-border text-muted-foreground text-[10px] uppercase font-mono font-bold">
          DEVNET STATUS
        </Badge>
      </div>

      <div className="space-y-3 font-mono text-xs">
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
          <div className="font-bold text-sm text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal" />
            No verified live Devnet strategy available.
          </div>
          <p className="text-xs text-muted-foreground">
            AgentFi operates on Solana Devnet. Mainnet yield protocols (such as Kamino or Orca mainnet pools) are not executable on Devnet test funds.
          </p>
        </div>

        <div className="text-[11px] text-muted-foreground bg-white/5 border border-white/5 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />
          <span>Market information is educational and is not financial advice.</span>
        </div>
      </div>
    </div>
  );
}
