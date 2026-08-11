import { motion } from "framer-motion";
import { useAgentStore } from "@/store/useAgentStore";
import { Cpu, HardDrive, Clock, List } from "lucide-react";
import { cn } from "@/lib/utils";

const TruthfulMetricItem = ({ 
  icon: Icon, 
  label, 
  valueStr 
}: { 
  icon: any, 
  label: string, 
  valueStr: string 
}) => {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <span className="text-sm font-mono font-medium text-foreground">
          {valueStr}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-primary/20 rounded-full w-full" />
      </div>
    </div>
  );
};

export function SystemHealth() {
  const store = useAgentStore();
  const solanaNetwork = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
  const isOnline = store.connectionStatus === "connected";
  const isDemo = store.connectionStatus === "demo";

  const statusText = isOnline ? "ONLINE" : isDemo ? "DEMO MODE" : "OFFLINE";

  return (
    <div className="glass-panel border border-border/40 rounded-2xl p-6 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-bold text-foreground/90">Infrastructure Health</h3>
        <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
          isOnline ? "bg-success/10 text-success border-success/20" :
          isDemo ? "bg-warning/10 text-warning border-warning/20" :
          "bg-destructive/10 text-destructive border-destructive/20"
        )}>
          {statusText}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <TruthfulMetricItem icon={Cpu} label="Core Engine Load" valueStr={isOnline && store.systemLoad > 0 ? `${store.systemLoad.toFixed(0)}%` : "N/A"} />
        <TruthfulMetricItem icon={HardDrive} label="Memory Usage" valueStr="N/A" />
        <TruthfulMetricItem icon={Clock} label="Response Time" valueStr="N/A" />
        <TruthfulMetricItem icon={List} label="Task Queue" valueStr={`${store.tasksRunning} active`} />
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-muted-foreground flex-wrap gap-2">
        <span>Backend: <strong className={isOnline ? "text-success" : "text-destructive"}>{statusText}</strong></span>
        <span className="font-mono text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded border border-warning/20 text-[10px]">
          SOLANA DEVNET — TEST FUNDS ONLY
        </span>
        <span className="font-mono">Node: sol-{solanaNetwork}</span>
      </div>
    </div>
  );
}
