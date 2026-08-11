import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, ShieldCheck, LineChart, Zap, CheckCircle2, PieChart, Target, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentState, AgentId } from "@/types/agents";
import { formatPercentage } from "@/utils/agentMetrics";

const iconMap: Record<AgentId, any> = {
  planner: BrainCircuit,
  risk: ShieldCheck,
  market: LineChart,
  execution: Zap,
  portfolio: PieChart,
  recommendation: Target,
  health: HeartPulse
};

export function AgentCard({ agent }: { agent: AgentState }) {
  const Icon = iconMap[agent.id] || BrainCircuit;

  const statusColors: Record<AgentState["status"], string> = {
    idle: "bg-muted-foreground",
    queued: "bg-blue-500",
    analyzing: "bg-primary",
    working: "bg-primary",
    waiting: "bg-warning",
    completed: "bg-success",
    failed: "bg-destructive"
  };

  const isActive = agent.status !== "idle" && agent.status !== "completed" && agent.status !== "failed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-panel rounded-2xl p-5 border relative overflow-hidden transition-all duration-500 min-h-[200px] h-full flex flex-col",
        isActive ? "border-primary/50 shadow-[0_0_30px_rgba(124,92,252,0.15)]" : "border-border/40",
        agent.status === "failed" && "border-destructive/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
      )}
    >
      {/* Active Glow Background */}
      {isActive && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Row */}
        <div className="grid grid-cols-[48px_minmax(0,1fr)_56px] items-start gap-3 mb-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 relative shrink-0",
            isActive ? "bg-primary/20 text-primary shadow-inner" : 
            agent.status === "failed" ? "bg-destructive/20 text-destructive" :
            agent.status === "completed" ? "bg-success/20 text-success" :
            "bg-white/5 text-muted-foreground"
          )}>
            <Icon className="w-6 h-6 z-10" />
            {isActive && (
              <div className="absolute inset-0 rounded-xl border border-primary/30 animate-ping opacity-20" />
            )}
          </div>
          
          <div className="min-w-0 flex flex-col justify-center h-12">
            <h3 className="font-bold font-display text-base xl:text-lg leading-tight truncate">{agent.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusColors[agent.status], isActive && "animate-pulse")} />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
                {agent.status}
              </span>
              <span className="text-[8px] font-mono text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-1 py-0.2 rounded shrink-0">
                Simulated
              </span>
            </div>
          </div>
          
          {/* Confidence Ring */}
          <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
              <motion.circle
                cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none"
                className={cn(agent.confidence >= 95 ? "text-success" : agent.confidence < 50 ? "text-destructive" : "text-primary")}
                strokeDasharray="150"
                initial={{ strokeDashoffset: 150 }}
                animate={{ strokeDashoffset: 150 - (150 * agent.confidence) / 100 }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[11px] font-bold font-mono tabular-nums leading-none flex flex-col items-center">
              {formatPercentage(agent.confidence).replace('%', '')}
              <span className="text-[8px] text-muted-foreground">%</span>
            </span>
          </div>
        </div>

        {/* Current Task area */}
        <div className="flex-1 flex flex-col justify-end">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={agent.currentTask + agent.status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-2"
            >
              {agent.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              ) : isActive ? (
                <div className="flex gap-0.5 shrink-0 mt-2">
                  <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
              )}
              <span className={cn(
                "text-sm font-medium line-clamp-2",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {agent.currentTask}
              </span>
            </motion.div>
          </AnimatePresence>
          
          {agent.progress > 0 && agent.progress < 100 && (
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${agent.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
