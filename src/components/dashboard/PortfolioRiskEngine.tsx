import { motion } from "framer-motion";
import { riskEngine } from "@/services/riskEngine";
import { ShieldAlert, TrendingDown, Target, Zap, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const RiskBar = ({ label, score, icon: Icon, inverse = false }: { label: string, score: number, icon: any, inverse?: boolean }) => {
  const isHighRisk = inverse ? score < 30 : score > 70;
  const isMediumRisk = inverse ? score < 60 : score > 40;
  const color = isHighRisk ? "bg-destructive" : isMediumRisk ? "bg-warning" : "bg-success";

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <span className="text-xs font-mono">{score}/100</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export function PortfolioRiskEngine() {
  const risk = riskEngine.analyzeRisk();

  return (
    <div className="glass-panel border border-border/40 rounded-2xl p-6 h-full flex flex-col">
      <h3 className="font-display font-bold flex items-center gap-2 mb-6 text-foreground/90">
        <ShieldAlert className="w-5 h-5 text-primary" />
        Portfolio Risk Engine
        <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
          Heuristic Assessment
        </span>
      </h3>

      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Overall Risk Score</span>
          <div className="text-3xl font-display font-bold mt-1">{risk.overallRiskScore}</div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
          risk.riskLevel === "Low" ? "bg-success/10 text-success border-success/20" :
          risk.riskLevel === "Medium" ? "bg-warning/10 text-warning border-warning/20" :
          "bg-destructive/10 text-destructive border-destructive/20"
        )}>
          {risk.riskLevel} Risk
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <RiskBar label="Concentration Risk" score={risk.concentrationRisk} icon={Target} />
        <RiskBar label="Volatility Risk" score={risk.volatilityRisk} icon={TrendingDown} />
        <RiskBar label="Liquidity Risk" score={risk.liquidityRisk} icon={Waves} inverse />
        <RiskBar label="Protocol Risk" score={risk.protocolRisk} icon={Zap} />
        <RiskBar label="Counterparty Risk" score={risk.counterpartyRisk} icon={ShieldAlert} />
      </div>

    </div>
  );
}
