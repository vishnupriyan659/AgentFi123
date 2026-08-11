import { Info } from "lucide-react";

export function DataTruthLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-xl border border-white/10 bg-white/5 text-[11px] font-mono text-muted-foreground my-3">
      <div className="flex items-center gap-1 font-semibold text-foreground">
        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Data Legend:</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-teal" />
        <span className="font-bold text-teal">LIVE</span>
        <span>= Blockchain/RPC & Backend</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-bold text-primary">CALCULATED</span>
        <span>= Derived from live inputs</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="font-bold text-amber-400">SIMULATED</span>
        <span>= Demo model feed</span>
      </div>
    </div>
  );
}
