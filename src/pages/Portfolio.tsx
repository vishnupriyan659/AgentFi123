import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, RefreshCw, Printer, AlertCircle, ArrowUpRight, ArrowDownRight, 
  ExternalLink, CheckCircle2, ShieldCheck, Database, FileText 
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { DataTruthLegend } from "@/components/common/DataTruthLegend";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function truncate(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function PortfolioContent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { snapshot, loading, error, isStale, refresh } = useLiveSnapshot();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const solBalance = snapshot?.wallet?.solBalance ?? null;
  const solPrice = snapshot?.market?.solUsdPrice ?? null;
  const mainnetReferenceValue =
    solBalance !== null && solPrice !== null ? solBalance * solPrice : null;

  const tokenAccounts = snapshot?.wallet?.tokenAccounts ?? [];
  const transactions = snapshot?.wallet?.recentTransactions ?? [];

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in print:p-0">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Portfolio Intelligence</h1>
            <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal font-mono font-bold text-xs uppercase px-2.5 py-0.5">
              LIVE DEVNET WALLET DATA — TEST FUNDS ONLY
            </Badge>
            {isStale && (
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning font-mono text-xs">
                STALE DATA
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time Solana Devnet RPC holdings, token balances, and transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handlePrintReport}
            variant="outline"
            className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </Button>

          <Button
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            variant="outline"
            className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <DataTruthLegend />
      </div>

      {/* Valuation Notice Banner */}
      <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-xs font-mono text-teal flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-teal" />
        <span>Devnet balances are test funds and have no real monetary value. USD figures, when shown, are mainnet market-price references only.</span>
      </div>

      {/* Primary Wallet Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connected Wallet */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Wallet
            </CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold font-mono text-foreground truncate">
              {connected && publicKey ? truncate(publicKey.toBase58()) : "Disconnected"}
            </div>
            {!connected && (
              <Button size="sm" onClick={() => setVisible(true)} className="mt-2 text-xs h-7 px-3 bg-primary">
                Connect Wallet
              </Button>
            )}
            {connected && (
              <div className="text-[11px] font-mono text-muted-foreground">
                Solana Devnet Active
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Devnet SOL Balance */}
        <Card className="glass-card border-teal/20 bg-teal/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Devnet SOL
            </CardTitle>
            <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-teal">
              {loading && solBalance === null ? (
                <span className="text-sm animate-pulse text-muted-foreground">Loading balance...</span>
              ) : solBalance !== null ? (
                `${solBalance.toFixed(4)} SOL`
              ) : (
                "0.0000 SOL"
              )}
            </div>
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-teal" /> Verified on Devnet RPC
            </div>
          </CardContent>
        </Card>

        {/* Mainnet Market Reference Value */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mainnet Reference Value
            </CardTitle>
            <Database className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {formatUsd(mainnetReferenceValue)}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              Educational reference only (SOL @ {formatUsd(solPrice)})
            </div>
          </CardContent>
        </Card>

        {/* Token Accounts Count */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Token Holdings
            </CardTitle>
            <FileText className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {tokenAccounts.length + 1} Assets
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              1 Native SOL + {tokenAccounts.length} SPL Token Accounts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Holdings Table */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="font-display text-base">Connected Wallet Asset Holdings</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Real-time SPL token accounts retrieved directly from Solana Devnet RPC.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 text-muted-foreground border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-mono">Asset</th>
                  <th className="px-4 py-3 font-mono">Mint / Program ID</th>
                  <th className="px-4 py-3 font-mono">Balance</th>
                  <th className="px-4 py-3 font-mono">Spot Price Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {/* Native SOL Row */}
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4 font-bold text-teal flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal shrink-0" /> Native SOL (Solana)
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">SystemProgram (Native)</td>
                  <td className="px-4 py-4 font-bold">{solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "0.0000 SOL"}</td>
                  <td className="px-4 py-4 text-foreground">{formatUsd(solPrice)} (CoinGecko)</td>
                </tr>

                {/* SPL Token Account Rows */}
                {tokenAccounts.map((token, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-bold text-foreground">{token.symbol}</td>
                    <td className="px-4 py-4 text-muted-foreground">{token.mint.slice(0, 12)}…</td>
                    <td className="px-4 py-4">{token.balance}</td>
                    <td className="px-4 py-4 text-muted-foreground italic">Market price unavailable</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Devnet Transactions */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-base">Confirmed Devnet Transactions</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Latest confirmed signatures retrieved from connected wallet.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-border text-muted-foreground text-xs font-mono">
            {transactions.length} Loaded
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {!publicKey ? (
            <div className="p-8 text-center text-xs font-mono text-muted-foreground">
              Connect Phantom wallet to view live Devnet transactions.
            </div>
          ) : transactions.length > 0 ? (
            <div className="divide-y divide-white/5 font-mono">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {tx.direction === "received" ? <ArrowDownRight className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Native Devnet SOL Transfer</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {tx.signature.slice(0, 12)}...{tx.signature.slice(-12)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <a
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                    >
                      Explorer <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-muted-foreground">
              No recent Devnet transaction signatures found for this wallet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Portfolio() {
  return (
    <ErrorBoundary fallbackTitle="Portfolio Intelligence Render Error">
      <PortfolioContent />
    </ErrorBoundary>
  );
}
