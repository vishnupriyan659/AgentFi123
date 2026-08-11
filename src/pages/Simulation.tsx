import React, { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Database, Wallet, PlayCircle, RefreshCw, AlertCircle, ShieldCheck, 
  Activity, CheckCircle2, Clock, Zap
} from "lucide-react";
import { DataTruthLegend } from "@/components/common/DataTruthLegend";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import { SolPriceChart } from "@/components/charts/SolPriceChart";

const RPC_REFRESH_INTERVAL_MS = 20000; // 20 seconds
const FALLBACK_PUBLIC_KEY = new PublicKey("11111111111111111111111111111111");

const safeFormatSol = (val: unknown, decimals = 6): string => {
  return typeof val === "number" && Number.isFinite(val)
    ? val.toFixed(decimals)
    : "Live data unavailable";
};

const safeFormatUsd = (val: unknown, decimals = 2): string => {
  if (typeof val !== "number" || !Number.isFinite(val)) return "Live data unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

export function StrategyLabContent() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();

  // 1. LIVE RPC NETWORK METRICS
  const [slot, setSlot] = useState<number | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [nodeVersion, setNodeVersion] = useState<string | null>(null);
  const [rpcStatus, setRpcStatus] = useState<"Online" | "Offline">("Online");
  const [rpcLastUpdated, setRpcLastUpdated] = useState<number | null>(null);
  const [rpcLoading, setRpcLoading] = useState<boolean>(true);

  // 2. LIVE RPC FEE ESTIMATION (No hardcoded 0.000005 SOL)
  const [liveFeeLamports, setLiveFeeLamports] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState<boolean>(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeLastUpdated, setFeeLastUpdated] = useState<number | null>(null);

  // 3. LIVE WALLET METRICS
  const [walletSolBalance, setWalletSolBalance] = useState<number | null>(null);
  const [splTokenCount, setSplTokenCount] = useState<number | null>(null);
  const [recentTxCount, setRecentTxCount] = useState<number | null>(null);
  const [walletLastUpdated, setWalletLastUpdated] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);

  // 4. LIVE MARKET DATA & CHART
  const {
    quote,
    history,
    range,
    setRange,
    loading: marketLoading,
    chartLoading,
    error: marketError,
    refresh: refreshMarket,
  } = useLiveMarketData();

  // 5. LIVE-INPUT DRY RUN STATE
  const [testAmountInput, setTestAmountInput] = useState<string>("0.01");
  const [dryRunResult, setDryRunResult] = useState<{
    solAmount: number;
    usdValue: number;
    feeLamports: number;
    feeSol: number;
    feeUsd: number;
    remainingSol: number;
    remainingUsd: number;
    timestamp: number;
  } | null>(null);
  const [dryRunNotice, setDryRunNotice] = useState<string | null>(null);

  // Fetch RPC Network Data
  const fetchRpcData = useCallback(async (mountedRef: { current: boolean }) => {
    try {
      setRpcLoading(true);
      const [currSlot, currBlockHeight, versionObj] = await Promise.all([
        connection.getSlot("confirmed"),
        connection.getBlockHeight("confirmed"),
        connection.getVersion(),
      ]);

      if (!mountedRef.current) return;
      setSlot(currSlot);
      setBlockHeight(currBlockHeight);
      setNodeVersion(versionObj["solana-core"] || "Solana Devnet");
      setRpcStatus("Online");
      setRpcLastUpdated(Date.now());
    } catch {
      if (!mountedRef.current) return;
      setRpcStatus("Offline");
    } finally {
      if (mountedRef.current) {
        setRpcLoading(false);
      }
    }
  }, [connection]);

  // Fetch Genuinely Returned Live Fee from connection.getFeeForMessage
  const fetchLiveFeeEstimate = useCallback(async (mountedRef: { current: boolean }) => {
    try {
      setFeeLoading(true);
      const payerKey = publicKey || FALLBACK_PUBLIC_KEY;
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payerKey,
          toPubkey: payerKey,
          lamports: 10000000,
        })
      );
      tx.recentBlockhash = blockhash;
      tx.feePayer = payerKey;
      const compiledMessage = tx.compileMessage();

      const feeRes = await connection.getFeeForMessage(compiledMessage, "confirmed");
      if (!mountedRef.current) return;

      if (feeRes && typeof feeRes.value === "number" && Number.isFinite(feeRes.value)) {
        setLiveFeeLamports(feeRes.value);
        setFeeError(null);
        setFeeLastUpdated(Date.now());
      } else {
        setLiveFeeLamports(null);
        setFeeError("Fee estimate unavailable");
      }
    } catch {
      if (!mountedRef.current) return;
      setLiveFeeLamports(null);
      setFeeError("Fee estimate unavailable");
    } finally {
      if (mountedRef.current) {
        setFeeLoading(false);
      }
    }
  }, [connection, publicKey]);

  // Fetch Wallet Data
  const fetchWalletData = useCallback(async (mountedRef: { current: boolean }) => {
    if (!connected || !publicKey) {
      setWalletSolBalance(null);
      setSplTokenCount(null);
      setRecentTxCount(null);
      setWalletLastUpdated(null);
      return;
    }

    try {
      setWalletLoading(true);
      const [lamports, parsedTokens, signatures] = await Promise.all([
        connection.getBalance(publicKey, "confirmed"),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }, "confirmed"),
        connection.getSignaturesForAddress(publicKey, { limit: 10 }, "confirmed"),
      ]);

      if (!mountedRef.current) return;
      setWalletSolBalance(lamports / 1e9);
      setSplTokenCount(parsedTokens.value.length);
      setRecentTxCount(signatures.length);
      setWalletLastUpdated(Date.now());
    } catch {
      if (!mountedRef.current) return;
      setWalletSolBalance(null);
    } finally {
      if (mountedRef.current) {
        setWalletLoading(false);
      }
    }
  }, [connection, connected, publicKey]);

  useEffect(() => {
    const mountedRef = { current: true };

    fetchRpcData(mountedRef);
    fetchLiveFeeEstimate(mountedRef);
    fetchWalletData(mountedRef);

    const rpcInterval = setInterval(() => {
      fetchRpcData(mountedRef);
      fetchLiveFeeEstimate(mountedRef);
    }, RPC_REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(rpcInterval);
    };
  }, [fetchRpcData, fetchLiveFeeEstimate, fetchWalletData]);

  // Execute Live-Input Dry Run
  const handleRunDryRun = () => {
    if (liveFeeLamports === null) {
      setDryRunNotice("Fee estimate unavailable. Cannot perform dry-run calculation without live network fee estimation.");
      setDryRunResult(null);
      return;
    }

    const parsedAmount = parseFloat(testAmountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setDryRunNotice("Please enter a valid positive SOL amount for dry-run calculation.");
      setDryRunResult(null);
      return;
    }

    const feeSol = liveFeeLamports / 1e9;
    const solPrice = quote?.priceUsd;
    const currentBalance = walletSolBalance ?? 0;

    const usdVal = Number.isFinite(solPrice) ? parsedAmount * (solPrice as number) : 0;
    const feeUsd = Number.isFinite(solPrice) ? feeSol * (solPrice as number) : 0;
    const remainingSol = Math.max(0, currentBalance - parsedAmount - feeSol);
    const remainingUsd = Number.isFinite(solPrice) ? remainingSol * (solPrice as number) : 0;

    setDryRunResult({
      solAmount: parsedAmount,
      usdValue: usdVal,
      feeLamports: liveFeeLamports,
      feeSol,
      feeUsd,
      remainingSol,
      remainingUsd,
      timestamp: Date.now(),
    });
    setDryRunNotice(null);
  };

  const rpcHostname = (() => {
    try {
      return new URL(connection.rpcEndpoint).hostname;
    } catch {
      return connection.rpcEndpoint;
    }
  })();

  const formatTimestamp = (ts: number | null) => (ts ? new Date(ts).toLocaleTimeString() : null);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">
              Strategy Lab & Analytics Studio
            </h1>
            <span className="bg-teal/10 text-teal border border-teal/20 text-xs px-2.5 py-1 rounded-full font-mono font-bold">
              LIVE-INPUT ANALYTICS
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Read-only Devnet blockchain metrics, live CoinGecko market pricing, and hypothetical transfer dry runs.
          </p>
        </div>
      </div>

      <DataTruthLegend />

      {/* Notice Banner */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs font-mono text-amber-400 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>
          Strategy Lab runs in read-only analysis mode. Dry runs calculate mathematical outcomes based on live prices and actual wallet balances without submitting blockchain transactions.
        </span>
      </div>

      {/* 1. LIVE RPC NETWORK METRICS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-primary">
              Live Solana Devnet Infrastructure
            </h2>
            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              LIVE RPC
            </span>
          </div>
          {rpcLastUpdated && (
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated {formatTimestamp(rpcLastUpdated)}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Current Devnet Slot</CardTitle>
              <Database className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-mono font-bold text-foreground">
                {slot !== null ? slot.toLocaleString() : rpcLoading ? "Loading..." : "Live data unavailable"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Confirmed cluster slot
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Block Height</CardTitle>
              <Activity className="w-4 h-4 text-teal" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-mono font-bold text-foreground">
                {blockHeight !== null ? blockHeight.toLocaleString() : rpcLoading ? "Loading..." : "Live data unavailable"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Solana ledger height
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Solana Core Version</CardTitle>
              <ShieldCheck className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-mono font-bold text-foreground">
                {nodeVersion || (rpcLoading ? "Loading..." : "Live data unavailable")}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                RPC: {rpcHostname}
              </p>
            </CardContent>
          </Card>

          {/* Requirement 1: Live RPC Fee Estimate */}
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-medium text-muted-foreground">Live Estimated Fee</CardTitle>
                <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                  LIVE RPC FEE ESTIMATE
                </span>
              </div>
              <Zap className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-mono font-bold text-foreground">
                {liveFeeLamports !== null
                  ? `${liveFeeLamports.toLocaleString()} lamports`
                  : feeLoading
                  ? "Estimating..."
                  : "Fee estimate unavailable"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                {liveFeeLamports !== null
                  ? `≈ ${safeFormatSol(liveFeeLamports / 1e9, 6)} SOL (${connection.getFeeForMessage.name})`
                  : feeError || "Failed to query RPC fee"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. LIVE CONNECTED WALLET METRICS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-primary">
              Live Connected Devnet Wallet
            </h2>
            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              LIVE DEVNET WALLET
            </span>
          </div>
          {walletLastUpdated && (
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated {formatTimestamp(walletLastUpdated)}
            </span>
          )}
        </div>

        {connected && publicKey ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-card border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Actual Devnet SOL Balance</CardTitle>
                <Wallet className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-bold text-foreground">
                  {walletSolBalance !== null ? `${safeFormatSol(walletSolBalance, 4)} SOL` : walletLoading ? "Loading..." : "Live data unavailable"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {quote?.priceUsd && walletSolBalance !== null
                    ? `≈ ${safeFormatUsd(walletSolBalance * quote.priceUsd)}`
                    : "Devnet SOL"}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">SPL Token Accounts</CardTitle>
                <Database className="w-4 h-4 text-teal" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-bold text-foreground">
                  {splTokenCount !== null ? `${splTokenCount} Token Accounts` : walletLoading ? "Loading..." : "Live data unavailable"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  Parsed token program accounts
                </p>
              </CardContent>
            </Card>

            {/* Requirement 2: Correct transaction-count wording */}
            <Card className="glass-card border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Recent Transactions Loaded</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-bold text-foreground">
                  {recentTxCount !== null ? `${recentTxCount} Signatures` : walletLoading ? "Loading..." : "Live data unavailable"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {recentTxCount !== null
                    ? `Latest ${recentTxCount} confirmed signatures (maximum 10)`
                    : "Devnet signatures"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="glass-card border-white/10">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-sm font-mono text-muted-foreground">
                Connect Phantom to load live wallet data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. REAL SOL/USD PRICE CHART */}
      <SolPriceChart
        history={history}
        range={range}
        onRangeChange={setRange}
        loading={chartLoading || marketLoading}
        error={marketError}
        priceChange24h={quote?.change24h}
        lastUpdated={quote?.updatedAt}
        provider={quote?.provider || "CoinGecko"}
        onRetry={refreshMarket}
      />

      {/* 4. LIVE-INPUT DRY RUN CALCULATOR */}
      <Card className="glass-card border-white/10 mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold font-display">Live-Input Transfer Dry Run</CardTitle>

                <span className="bg-teal/10 text-teal border border-teal/20 text-xs px-2.5 py-1 rounded-full font-mono font-bold">
                  CALCULATED FROM LIVE INPUTS
                </span>
              </div>
              <CardDescription className="mt-1">
                Calculate hypothetical transfer outcomes using live market prices, real RPC estimated network fees, and connected wallet balance.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                Hypothetical Transfer Amount (SOL)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  min="0.000001"
                  value={testAmountInput}
                  onChange={(e) => setTestAmountInput(e.target.value)}
                  placeholder="e.g. 0.01"
                  className="bg-black/40 border-white/10 font-mono text-foreground h-11 text-base pr-16"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-muted-foreground font-bold">
                  SOL
                </span>
              </div>
            </div>

            <Button
              onClick={handleRunDryRun}
              disabled={liveFeeLamports === null}
              className="gap-2 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-xl h-11 px-6 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" /> Run Live-Input Dry Run
            </Button>
          </div>

          {dryRunNotice && (
            <div className="p-3 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-mono">
              {dryRunNotice}
            </div>
          )}

          {dryRunResult && (
            <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-teal/20 pb-3">
                <div className="font-bold text-sm font-display text-foreground flex items-center gap-2">
                  <span>Dry Run Calculation Breakdown</span>
                  <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono">
                    CALCULATED FROM LIVE INPUTS
                  </Badge>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Computed {new Date(dryRunResult.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase font-mono">Entered SOL</span>
                  <div className="text-lg font-mono font-bold text-foreground">
                    {safeFormatSol(dryRunResult.solAmount, 4)} SOL
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {quote?.priceUsd ? safeFormatUsd(dryRunResult.usdValue) : "Price unavailable"}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase font-mono">RPC Estimated Network Fee</span>
                  <div className="text-lg font-mono font-bold text-foreground">
                    {safeFormatSol(dryRunResult.feeSol, 6)} SOL
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {dryRunResult.feeLamports.toLocaleString()} lamports {quote?.priceUsd ? `(${safeFormatUsd(dryRunResult.feeUsd, 4)})` : ""}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase font-mono">Remaining SOL</span>
                  <div className="text-lg font-mono font-bold text-teal">
                    {safeFormatSol(dryRunResult.remainingSol, 4)} SOL
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Post-transfer Devnet balance
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase font-mono">Remaining USD Value</span>
                  <div className="text-lg font-mono font-bold text-foreground">
                    {quote?.priceUsd ? safeFormatUsd(dryRunResult.remainingUsd) : "Live data unavailable"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Based on CoinGecko rate
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-muted-foreground pt-2 flex items-center gap-1.5 border-t border-teal/10">
                <ShieldCheck className="w-3.5 h-3.5 text-teal shrink-0" />
                <span>CALCULATED FROM LIVE INPUTS — NO TRANSACTION EXECUTED. This is a mathematical simulation only and does not broadcast to Solana Devnet.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Simulation() {
  return (
    <ErrorBoundary>
      <StrategyLabContent />
    </ErrorBoundary>
  );
}
