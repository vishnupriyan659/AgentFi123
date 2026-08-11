import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Copy, LogOut, ChevronDown, Check, Loader2 } from "lucide-react";
import { useSolBalance } from "@/hooks/useSolBalance";
import { GetTestSolModal } from "@/components/common/GetTestSolModal";

const truncate = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

export const Header = () => {
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { balance, loading } = useSolBalance();
  const [copied, setCopied] = useState(false);

  const address = useMemo(() => publicKey?.toBase58() ?? "", [publicKey]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-2xl">
      <div className="flex h-20 items-center justify-end gap-4 px-8">
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="hidden items-center gap-2 rounded-full border border-warning/20 bg-warning/10 px-3 py-1.5 text-[11px] font-semibold text-warning uppercase tracking-wider sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
            </span>
            SOLANA DEVNET — TEST ONLY
          </div>

          {/* Get Test SOL Button & Modal */}
          <GetTestSolModal />

          {connected && publicKey ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="gap-2 border border-border/50 bg-white/5 pl-2 pr-3 hover:bg-white/10 rounded-xl h-10 transition-all duration-300"
                >
                  {wallet?.adapter.icon && (
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="h-5 w-5 rounded-md"
                    />
                  )}
                  <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                    {loading && balance === null ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>{balance !== null ? balance.toFixed(3) : "—"} SOL</>
                    )}
                  </span>
                  <span className="mx-1 hidden h-4 w-px bg-border sm:inline" />
                  <span className="font-mono text-xs font-medium">{truncate(address)}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass-card rounded-xl border-border/50">
                <DropdownMenuLabel className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                    Connected wallet
                  </div>
                  <div className="font-mono text-xs break-all text-foreground/90">{address}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="opacity-50" />
                <div className="px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                    Intelligence Balance
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold gradient-text">
                    {balance !== null ? balance.toFixed(4) : "—"}{" "}
                    <span className="text-xs font-normal text-muted-foreground uppercase tracking-wider">SOL</span>
                  </div>
                </div>
                <DropdownMenuSeparator className="opacity-50" />
                <DropdownMenuItem onClick={copyAddress} className="gap-2 cursor-pointer focus:bg-white/5 rounded-lg">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy address"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => disconnect()}
                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg mt-1"
                >
                  <LogOut className="h-4 w-4" /> Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => setVisible(true)}
              disabled={connecting}
              className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90 glow-primary rounded-xl h-10 px-5 shadow-lg shadow-primary/20 transition-all duration-300"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" /> Connect System
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
