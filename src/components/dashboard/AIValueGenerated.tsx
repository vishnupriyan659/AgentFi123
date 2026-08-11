import { Zap, TrendingUp, ShieldCheck, Clock, Target, Rocket } from "lucide-react";

export function AIValueGenerated() {
  const metrics = [
    { label: "Yield Improvement", value: "Active", icon: TrendingUp, color: "text-success" },
    { label: "Risk Reduction", value: "-18%", icon: ShieldCheck, color: "text-warning" },
    { label: "Transactions Optimized", value: "42", icon: Zap, color: "text-primary" },
    { label: "Strategies Executed", value: "15", icon: Rocket, color: "text-foreground" },
    { label: "Time Saved", value: "26 Hrs", icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="glass-panel border border-primary/20 rounded-2xl p-6 h-full flex flex-col bg-primary/5">
      <h3 className="font-display font-bold flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-primary" />
        AI Value Generated
      </h3>

      <div className="mb-8 text-center bg-background/50 border border-white/5 rounded-xl py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-2">Total Value Generated</span>
        <div className="text-5xl font-display font-bold text-success">
          +$1,247
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {metrics.map(m => (
          <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center text-center">
            <m.icon className={`w-5 h-5 mb-2 ${m.color}`} />
            <div className={`text-xl font-display font-bold ${m.color} mb-1`}>{m.value}</div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
