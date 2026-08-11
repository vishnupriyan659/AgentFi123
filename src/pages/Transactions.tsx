import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import type { ActionKind } from "@/lib/intentParser";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 10;

const TransactionIcon = ({ type }: { type: ActionKind | "unknown" }) => {
  const icons: Record<string, React.ElementType> = {
    swap: ArrowRightLeft,
    buy: ArrowDownRight,
    sell: ArrowUpRight,
    send: Send,
    dca: RefreshCw,
    limit: ArrowRightLeft,
    stop_loss: ArrowUpRight,
    take_profit: ArrowDownRight,
    arbitrage: ArrowRightLeft,
    stake: ArrowDownRight,
    rebalance: RefreshCw,
    multi_hop: ArrowRightLeft,
    unknown: ArrowRightLeft,
  };
  const Icon = icons[type] || ArrowRightLeft;
  return <Icon className="h-4 w-4" />;
};

const StatusBadge = ({ status }: { status: Transaction["status"] }) => {
  const config = {
    confirmed: {
      icon: CheckCircle2,
      label: "Confirmed",
      className: "border-teal/30 bg-teal/10 text-teal",
    },
    pending: {
      icon: Clock,
      label: "Pending",
      className: "border-warning/30 bg-warning/10 text-warning",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
  };
  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

import { useSolBalance } from "@/hooks/useSolBalance";

export default function Transactions() {
  const { publicKey } = useWallet();
  const { balance: liveSolBalance, loading: balanceLoading } = useSolBalance();
  const { transactions, loading, error, refresh, stats } = useTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Transaction["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Transaction["type"]>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      searchQuery === "" ||
      tx.fromToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.toToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.intent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.signature.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Portfolio & Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Confirmed Solana Devnet transaction history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading || !publicKey}
            className="gap-2 rounded-xl h-10 px-4 font-mono text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh History
          </Button>
        </div>
      </div>

      {/* Stats Header Row with Prominent Live SOL Balance First */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-teal/30 bg-teal/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Devnet SOL</p>
            <p className="font-mono text-2xl font-bold text-teal mt-1">
              {balanceLoading
                ? "Loading..."
                : liveSolBalance !== null
                ? `${liveSolBalance.toFixed(4)} SOL`
                : "0.0000 SOL"}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Transactions</p>
            <p className="font-mono text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">Confirmed</p>
            <p className="font-mono text-2xl font-bold text-success mt-1">
              {stats.successful}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume</p>
            <p className="font-mono text-2xl font-bold mt-1">
              {stats.totalVolume.toFixed(4)} SOL
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by token, intent, or signature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="swap">Swap</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="send">Send</SelectItem>
                <SelectItem value="dca">DCA</SelectItem>
                <SelectItem value="limit">Limit Order</SelectItem>
                <SelectItem value="stop_loss">Stop Loss</SelectItem>
                <SelectItem value="take_profit">Take Profit</SelectItem>
                <SelectItem value="arbitrage">Arbitrage</SelectItem>
                <SelectItem value="stake">Stake</SelectItem>
                <SelectItem value="rebalance">Rebalance</SelectItem>
                <SelectItem value="multi_hop">Multi-hop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-base">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!publicKey ? (
            <div className="p-12 text-center text-muted-foreground font-mono">
              Connect Phantom to view transaction history.
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">
              Loading Devnet transactions...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-destructive font-mono space-y-3">
              <div>{error}</div>
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : paginatedTransactions.length > 0 ? (
            <div className="divide-y divide-border">
              {paginatedTransactions.map((tx) => {
                const feeLabel = tx.isFeePayer
                  ? `Your fee: ${tx.userFee.toFixed(6)} SOL`
                  : `Network fee: ${tx.networkFee.toFixed(6)} SOL — paid by sender`;

                const amountText = tx.direction === "received"
                  ? `+${tx.fromAmount.toFixed(4)} SOL`
                  : tx.direction === "sent"
                  ? `-${tx.fromAmount.toFixed(4)} SOL`
                  : `0.0000 SOL`;

                const amountColor = tx.direction === "received"
                  ? "text-success"
                  : tx.direction === "sent"
                  ? "text-foreground"
                  : "text-muted-foreground";

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <TransactionIcon type={tx.type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {tx.intent || (tx.type === "unknown" ? "Unknown transaction" : tx.type)}
                          </span>
                          <StatusBadge status={tx.status} />
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {tx.signature.slice(0, 12)}...{tx.signature.slice(-12)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.slot ? `Slot ${tx.slot} · ` : ""}{new Date(tx.timestamp).toLocaleString()} · Route: {tx.route}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-medium font-mono", amountColor)}>{amountText}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {feeLabel}
                      </p>
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                      >
                        View Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-muted-foreground font-mono">No Devnet transactions yet.</p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{" "}
                {filteredTransactions.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
