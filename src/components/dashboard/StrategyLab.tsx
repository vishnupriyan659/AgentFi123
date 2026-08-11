import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, ArrowRight, Zap, Target, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/store/useAgentStore";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export function StrategyLabContent() {
  const connectionStatus = useAgentStore((s) => s.connectionStatus);
  const isDemo = connectionStatus === "demo";

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const scenarios = [
    {
      id: "stake",
      title: "Stake 50% SOL",
      riskChange: "Unchanged",
      healthChange: "+8",
      yieldChange: "Reference Rate",
      reason: "Idle assets converted into yield-generating positions.",
    },
    {
      id: "stable",
      title: "Move 20% into USDC",
      riskChange: "-15%",
      healthChange: "+5",
      yieldChange: "+1.2%",
      reason: "Reduces volatility exposure during uncertain market conditions.",
    },
    {
      id: "rebalance",
      title: "Auto Rebalance",
      riskChange: "-5%",
      healthChange: "+12",
      yieldChange: "+2.1%",
      reason: "Realigns portfolio to target risk parameters.",
    },
  ];

  const applyScenario = (id: string) => {
    setSimulating(true);
    setTimeout(() => {
      setActiveScenario(id);
      setSimulating(false);
    }, 800);
  };

  const activeData = scenarios.find((s) => s.id === activeScenario);

  return (
    <div className="glass-panel border border-primary/20 rounded-3xl p-6 lg:p-8 flex flex-col h-[500px]">
      <h3 className="font-display font-bold text-xl flex items-center gap-3 mb-6">
        <Beaker className="w-6 h-6 text-primary" />
        Strategy Lab
        <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
          {isDemo ? "Demo Simulation" : "Portfolio Simulation"}
        </span>
      </h3>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 h-full overflow-hidden">
        {/* Left: Scenarios */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3 overflow-y-auto no-scrollbar pr-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Test Scenarios
          </span>
          {scenarios.map((s) => (
            <button
              key={s.id}
              id={`scenario-btn-${s.id}`}
              onClick={() => applyScenario(s.id)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group",
                activeScenario === s.id
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              )}
            >
              <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
                {s.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{s.reason}</p>
            </button>
          ))}
        </div>

        {/* Right: Results Dashboard */}
        <div className="w-full lg:w-2/3 bg-background/40 border border-white/5 rounded-2xl p-6 relative flex flex-col justify-center items-center">
          <AnimatePresence mode="wait">
            {!activeScenario && !simulating && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground flex flex-col items-center justify-center h-full w-full"
              >
                <Beaker className="w-12 h-12 mb-4 opacity-20" />
                <p className="mb-4 text-sm font-mono">Select a scenario to simulate portfolio changes.</p>
                <div className="w-full max-w-sm rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Live strategy execution is not available yet.
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Use the Devnet Transfer Agent for verified native SOL transfers.
                  </p>
                </div>
              </motion.div>
            )}

            {simulating && (
              <motion.div
                key="simulating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center flex flex-col items-center"
              >
                <div className="w-12 h-12 relative mb-4">
                  <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-b-2 border-success rounded-full animate-spin animation-delay-150"></div>
                </div>
                <p className="text-primary font-mono text-sm animate-pulse">Running Monte Carlo simulation...</p>
              </motion.div>
            )}

            {activeScenario && !simulating && activeData && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Current Portfolio</span>
                    <div className="w-14 h-14 rounded-full border-4 border-muted-foreground/30 flex items-center justify-center">
                      <Target className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center flex-1 text-primary">
                    <span className="text-[10px] uppercase tracking-wider mb-2 font-bold animate-pulse">Scenario Applied</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold mb-2">Projected Portfolio</span>
                    <div className="w-14 h-14 rounded-full border-4 border-primary flex items-center justify-center bg-primary/10 shadow-[0_0_20px_rgba(124,92,252,0.3)]">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Expected Yield (Simulated)</span>
                    <span className="text-lg font-display font-bold text-success flex items-center justify-center gap-1">
                      {activeData.yieldChange} <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Risk Profile (Simulated)</span>
                    <span className="text-lg font-display font-bold text-foreground">
                      {activeData.riskChange}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Health Score (Simulated)</span>
                    <span className="text-lg font-display font-bold text-success">
                      {activeData.healthChange}
                    </span>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mt-auto space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs uppercase tracking-wider text-primary font-bold">AI Commentary (Simulated)</span>
                    <span className="text-[10px] font-mono text-primary flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Simulation Model
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 font-mono">{activeData.reason}</p>

                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Live strategy execution is not available yet.</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Use the Devnet Transfer Agent for verified native SOL transfers.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function StrategyLab() {
  return (
    <ErrorBoundary fallbackTitle="Strategy Lab Component Error">
      <StrategyLabContent />
    </ErrorBoundary>
  );
}
