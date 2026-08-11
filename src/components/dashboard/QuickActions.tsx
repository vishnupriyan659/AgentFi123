import { Zap, ArrowRight, TrendingUp, ShieldAlert } from "lucide-react";

export function QuickActions() {
  const actions = [
    { title: "Stake Devnet SOL", icon: TrendingUp, impact: "Devnet Yield", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
    { title: "Optimize Strategy", icon: ShieldAlert, impact: "Risk Analysis", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
    { title: "Scan Liquidity", icon: Zap, impact: "Live Signals", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" }
  ];

  return (
    <div className="glass-panel border border-primary/20 rounded-2xl p-6 h-full flex flex-col bg-gradient-to-b from-primary/5 to-transparent">
      <h3 className="font-display font-bold flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-primary" />
        One-Click AI Actions
      </h3>

      <div className="flex-1 space-y-3">
        {actions.map((a, i) => (
          <button key={i} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 flex items-center justify-between transition-all group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${a.bg} ${a.border} ${a.color}`}>
                <a.icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{a.title}</h4>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${a.color}`}>
                  {a.impact}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
