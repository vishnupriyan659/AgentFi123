import { motion } from "framer-motion";
import { Activity, ShieldCheck, Zap, Server, Network } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import { cn } from "@/lib/utils";

const MetricItem = ({ icon: Icon, label, value, unit = "", highlight = false }: { icon: any, label: string, value: string | number, unit?: string, highlight?: boolean }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className={cn("p-2 rounded-lg bg-white/5 border border-white/10 shrink-0", highlight ? "text-success" : "text-primary")}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold font-display tabular-nums whitespace-nowrap">{value}</span>
        {unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  </div>
);

export function GlobalSystemStatus() {
  const store = useAgentStore();

  const getStatusColor = () => {
    switch (store.connectionStatus) {
      case "connected": return "bg-success";
      case "demo": return "bg-warning";
      case "offline": return "bg-destructive";
      case "error": return "bg-destructive";
      default: return "bg-primary animate-pulse";
    }
  };

  const getStatusText = () => {
    switch (store.connectionStatus) {
      case "connected": return "Backend Connected";
      case "demo": return "Demo Mode Active";
      case "offline": return "Backend Offline";
      case "error": return "Connection Error";
      default: return "Connecting...";
    }
  };

  const completedCount = store.activityHistory.filter(a => a.status === "success").length;
  const errorCount = store.activityHistory.filter(a => a.status === "error").length;
  const totalFinished = completedCount + errorCount;
  
  const successRateText = totalFinished > 0 
    ? `${((completedCount / totalFinished) * 100).toFixed(1)}%` 
    : "N/A";

  const networkLoadText = store.connectionStatus === "connected" && store.systemLoad > 0
    ? `${store.systemLoad.toFixed(0)}%`
    : "N/A";

  const activeAgentsCount = Object.values(store.agents).filter(a => a.status !== "idle").length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full glass-panel border border-border/40 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex h-3 w-3">
          {store.connectionStatus === "connected" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
          )}
          <span className={cn("relative inline-flex h-3 w-3 rounded-full", getStatusColor())}></span>
        </div>
        <span className="font-display font-semibold text-sm uppercase tracking-widest text-foreground/80 whitespace-nowrap">
          {getStatusText()}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-6 w-full lg:w-auto">
        <MetricItem icon={Network} label="Network Load" value={networkLoadText} />
        <MetricItem icon={Server} label="Active Agents" value={activeAgentsCount} />
        <MetricItem icon={Activity} label="Tasks Running" value={store.tasksRunning} />
        <MetricItem icon={ShieldCheck} label="Success Rate" value={successRateText} highlight={successRateText !== "N/A"} />
      </div>
    </motion.div>
  );
}
