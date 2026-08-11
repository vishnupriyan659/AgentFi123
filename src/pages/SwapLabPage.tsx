import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRightLeft, RefreshCw, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface SwapSimulationResult {
  inputAmount: number;
  inputToken: string;
  outputToken: string;
  referencePriceUsd: number | null;
  estimatedOutput: number | null;
  priceSource: string;
  dataStatus: "LIVE" | "CACHED" | "UNAVAILABLE";
  timestamp: string;
  message: "Simulation completed. No blockchain transaction was created.";
}

export function SwapLabPageContent() {
  const { snapshot, loading, isStale, refresh } = useLiveSnapshot();

  const [inputAmount, setInputAmount] = useState<string>("1.0");
  const [inputToken, setInputToken] = useState<string>("SOL");
  const [outputToken, setOutputToken] = useState<string>("USDC");
  const [result, setResult] = useState<SwapSimulationResult | null>(null);

  const solUsdPrice = snapshot?.market?.solUsdPrice ?? null;
  const isPriceAvailable = solUsdPrice !== null && Number.isFinite(solUsdPrice);

  const dataStatus: "LIVE" | "CACHED" | "UNAVAILABLE" = !isPriceAvailable
    ? "UNAVAILABLE"
    : isStale
    ? "CACHED"
    : "LIVE";

  const handleRunSimulation = () => {
    const numericAmount = parseFloat(inputAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setResult(null);
      return;
    }

    const estimatedOutput = isPriceAvailable ? numericAmount * solUsdPrice : null;

    setResult({
      inputAmount: numericAmount,
      inputToken,
      outputToken,
      referencePriceUsd: solUsdPrice,
      estimatedOutput,
      priceSource: "CoinGecko Market API",
      dataStatus,
      timestamp: new Date().toISOString(),
      message: "Simulation completed. No blockchain transaction was created.",
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Swap Lab</h1>
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning font-mono font-bold text-xs uppercase">
              DRY-RUN SIMULATION ONLY
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Educational dry-run swap calculator derived strictly from verified live spot price feeds.
          </p>
        </div>

        <Button
          onClick={() => refresh()}
          disabled={loading}
          variant="outline"
          className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Spot Price
        </Button>
      </div>

      {/* MANDATORY PERMANENT BANNER */}
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 font-mono text-xs text-warning font-bold flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-warning" />
        <span>SIMULATION ONLY — NO TRANSACTION WILL BE SIGNED OR BROADCAST</span>
      </div>

      {/* Safety Notice */}
      <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 font-mono text-xs text-teal flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-teal" />
        <span>Swap Lab never requests Phantom signatures, builds blockchain transactions, or executes mainnet swaps.</span>
      </div>

      {/* Swap Simulation Calculator Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-white/10 font-mono text-xs space-y-4">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              Swap Preview Parameters
            </CardTitle>
            <CardDescription className="text-xs">
              Select test tokens and input amount to preview dry-run pricing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Input Token Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Input Token
              </label>
              <div className="p-3 rounded-xl border border-white/10 bg-black/40 flex justify-between items-center text-sm font-bold text-foreground">
                <span>{inputToken} (Native SOL)</span>
                <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px]">
                  TEST TOKEN
                </Badge>
              </div>
            </div>

            {/* Test Amount Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Test Amount ({inputToken})
              </label>
              <Input
                type="number"
                min="0.001"
                step="0.1"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="1.0"
                className="bg-black/40 border-white/10 font-mono text-sm h-11"
              />
            </div>

            {/* Output Token Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Output Token
              </label>
              <div className="p-3 rounded-xl border border-white/10 bg-black/40 flex justify-between items-center text-sm font-bold text-foreground">
                <span>{outputToken} (USD Coin Reference)</span>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
                  STABLECOIN
                </Badge>
              </div>
            </div>

            {/* Price Reference & Status */}
            <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Reference Spot Price:</span>
                <span className="font-bold text-foreground">
                  {isPriceAvailable ? `$${solUsdPrice.toFixed(2)} USD` : "Quote unavailable"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Data Source:</span>
                <span className="text-teal font-bold">CoinGecko Market API</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Data Status:</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-bold ${
                    dataStatus === "LIVE"
                      ? "border-success/30 text-success bg-success/10"
                      : dataStatus === "CACHED"
                      ? "border-warning/30 text-warning bg-warning/10"
                      : "border-destructive/30 text-destructive bg-destructive/10"
                  }`}
                >
                  {dataStatus}
                </Badge>
              </div>
            </div>

            {/* MANDATORY ACTION BUTTON */}
            <Button
              onClick={handleRunSimulation}
              disabled={!isPriceAvailable || !inputAmount || parseFloat(inputAmount) <= 0}
              className="w-full gap-2 bg-gradient-primary text-white hover:opacity-90 font-mono text-xs h-11 rounded-xl shadow-lg"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Run Swap Simulation
            </Button>
          </CardContent>
        </Card>

        {/* Simulation Output Display Panel */}
        <Card className="glass-card border-white/10 font-mono text-xs flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              Dry-Run Output Details
            </CardTitle>
            <CardDescription className="text-xs">
              Simulation results derived without blockchain execution.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 flex-1">
            {result ? (
              <div className="space-y-4">
                {/* Result Message Notice */}
                <div className="p-3 rounded-xl border border-teal/30 bg-teal/10 text-teal text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {result.message}
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Input Amount:</span>
                    <span className="font-bold text-foreground">{result.inputAmount} {result.inputToken}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Reference Price:</span>
                    <span className="font-bold text-foreground">
                      {result.referencePriceUsd !== null ? `$${result.referencePriceUsd.toFixed(2)}` : "Quote unavailable"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-white/10 pt-2">
                    <span className="text-muted-foreground font-bold">Estimated Output:</span>
                    <span className="font-bold text-teal text-sm">
                      {result.estimatedOutput !== null ? `${result.estimatedOutput.toFixed(2)} ${result.outputToken}` : "Quote unavailable"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Timestamp:
                    </span>
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-white/5 text-[11px] text-muted-foreground space-y-1">
                  <strong>Non-On-Chain Verification:</strong> No Phantom signature requested. No transaction created, signed, or submitted to Solana Devnet.
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <ArrowRightLeft className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p>Click "Run Swap Simulation" to calculate educational swap outputs.</p>
                {!isPriceAvailable && (
                  <p className="text-destructive font-bold text-xs">Quote unavailable (Live market feed offline).</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SwapLabPage() {
  return (
    <ErrorBoundary fallbackTitle="Swap Lab Error">
      <SwapLabPageContent />
    </ErrorBoundary>
  );
}
