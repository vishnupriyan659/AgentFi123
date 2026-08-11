import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Activity, Clock, Fuel, Droplet, TrendingUp, TrendingDown } from "lucide-react";
import type { ParsedIntent } from "@/lib/intentParser";

const SOL_USD_BASE = 168.42;

interface Props {
  intent: ParsedIntent;
}

export const SimulationCard = ({ intent }: Props) => {
  const { simulation } = intent;
  const [tick, setTick] = useState(0);
  const [solPrice, setSolPrice] = useState(SOL_USD_BASE);
  const [outPrice, setOutPrice] = useState(simulation.outPriceSol);

  useEffect(() => {
    setOutPrice(simulation.outPriceSol);
  }, [simulation.outPriceSol]);

  // SimulationCard displays static preview derived from parsed intent without Math.random jitter

  const out = Math.max(
    0,
    Math.floor((simulation.inAmount * (1 - simulation.slippagePct / 100)) / (outPrice || 1e-12))
  );
  const trendingUp = tick % 2 === 0;

  return (
    <Card className="glass-card hover-lift animate-fade-in-up [animation-delay:160ms]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal/15 text-teal">
            <Activity className="h-4 w-4" />
          </div>
          <CardTitle className="font-display text-base">Execution Preview</CardTitle>
        </div>
        <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal">
          {simulation.route}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You send</span>
              <span className="font-mono">${solPrice.toFixed(2)} / SOL</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-semibold">
                {simulation.inAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span className="font-mono text-sm text-muted-foreground">{simulation.inToken}</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You receive (≈)</span>
              <span
                className={`inline-flex items-center gap-1 font-mono ${
                  trendingUp ? "text-teal" : "text-warning"
                }`}
              >
                {trendingUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                live
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                key={out}
                className="font-display text-2xl font-semibold gradient-text animate-fade-in"
              >
                {out.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-muted-foreground">${simulation.outToken}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplet className="h-3 w-3" />
              Slippage
            </div>
            <div className="mt-0.5 font-mono text-sm text-foreground">
              {simulation.slippagePct.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Fuel className="h-3 w-3" />
              Network
            </div>
            <div className="mt-0.5 font-mono text-sm text-foreground">
              {simulation.networkFeeSol.toFixed(5)} SOL
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Time
            </div>
            <div className="mt-0.5 font-mono text-sm text-foreground">
              ~{simulation.estSeconds.toFixed(1)}s
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
