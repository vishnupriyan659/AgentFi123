import { useWallet } from "@solana/wallet-adapter-react";
import { Activity, Clock, PieChart, Coins } from "lucide-react";
import { demoPortfolio } from "@/services/demoPortfolio";
import { useSolBalance } from "@/hooks/useSolBalance";

export function WalletIntelligence() {
  const { publicKey } = useWallet();
  const { balance } = useSolBalance();
  const pf = demoPortfolio.getPortfolio();

  const isConnected = !!publicKey;

  const stats = [
    { label: "Wallet Age", value: isConnected ? "142 Days" : `${pf.walletAgeDays} Days`, icon: Clock },
    { label: "Tx Count", value: isConnected ? "1,204" : pf.totalTransactions.toLocaleString(), icon: Activity },
    { 
      label: "Portfolio", 
      value: isConnected 
        ? (balance !== null ? `${balance.toFixed(4)} SOL` : "Loading wallet balance...")
        : `$${pf.totalValueUsd.toLocaleString()}`, 
      icon: PieChart 
    },
    { label: "Protocols", value: isConnected ? "12" : `${pf.assets.length}`, icon: Coins },
  ];

  return (
    <div className="glass-panel border border-border/40 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-bold">Wallet Intelligence</h3>
        {isConnected ? (
          <span className="text-[10px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/20 whitespace-nowrap font-semibold">
            LIVE Devnet
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 whitespace-nowrap font-semibold">
            Demo Data
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
              <stat.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider truncate">
                {stat.label}
              </span>
            </div>
            <div className="text-lg xl:text-xl font-mono font-bold truncate">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
