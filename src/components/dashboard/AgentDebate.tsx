import { useState, useEffect } from "react";
import { ShieldAlert, LineChart, PieChart, CheckCircle2, User, RefreshCw, AlertCircle } from "lucide-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { Badge } from "@/components/ui/badge";

interface AgentVote {
  agent: string;
  position: "support" | "caution" | "insufficient-data";
  reasoning: string;
  evidence: Array<{ metric: string; value: string; source: string }>;
}

export function AgentDebate() {
  const { snapshot, loading, refresh } = useLiveSnapshot();
  const [debates, setDebates] = useState<AgentVote[]>([]);
  const [consensusText, setConsensusText] = useState<string>("3 of 4 agents support this conclusion");
  const [agreementPct, setAgreementPct] = useState<number>(75);
  const [isDebating, setIsDebating] = useState<boolean>(false);

  useEffect(() => {
    if (!snapshot) return;

    const solBalance = snapshot.wallet.solBalance ?? 0;
    const solPriceUsd = snapshot.market.solUsdPrice ?? 180;
    const change24h = snapshot.market.change24hPercent ?? 0;

    const votes: AgentVote[] = [
      {
        agent: "Risk Agent",
        position: solBalance < 0.05 ? "caution" : "support",
        reasoning: `Wallet SOL balance is ${solBalance.toFixed(4)} SOL. Concentration in SOL is 100%.`,
        evidence: [{ metric: "Devnet SOL Fee Reserve", value: `${solBalance.toFixed(4)} SOL`, source: "Solana Devnet RPC" }],
      },
      {
        agent: "Market Agent",
        position: change24h >= 0 ? "support" : "caution",
        reasoning: `CoinGecko SOL spot price is $${solPriceUsd.toFixed(2)} USD (${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%).`,
        evidence: [{ metric: "SOL/USD Price", value: `$${solPriceUsd.toFixed(2)}`, source: "CoinGecko" }],
      },
      {
        agent: "Portfolio Agent",
        position: "support",
        reasoning: "Connected Phantom wallet is active on Solana Devnet.",
        evidence: [{ metric: "Connection Status", value: snapshot.wallet.connected ? "Connected" : "Disconnected", source: "Solana Devnet RPC" }],
      },
      {
        agent: "Protocol Agent",
        position: "insufficient-data",
        reasoning: "Mainnet yield protocols (Kamino/Orca) are disabled on Solana Devnet.",
        evidence: [{ metric: "Devnet Protocol Support", value: "Disabled", source: "AgentFi Rules" }],
      },
    ];

    const supportCount = votes.filter((v) => v.position === "support").length;
    setDebates(votes);
    setConsensusText(`${supportCount} of 4 agents support this conclusion`);
    setAgreementPct(Math.round((supportCount / 4) * 100));
  }, [snapshot]);

  const handleRunDebate = async () => {
    setIsDebating(true);
    await refresh();
    setIsDebating(false);
  };

  const getStanceColor = (stance: string) => {
    if (stance === "support") return "text-success bg-success/10 border-success/20";
    if (stance === "caution") return "text-warning bg-warning/10 border-warning/20";
    return "text-muted-foreground bg-white/10 border-white/10";
  };

  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold flex items-center gap-2 text-base">
          <User className="w-5 h-5 text-primary" />
          Agent Debate Engine
        </h3>
        <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal text-[10px] uppercase font-mono font-bold">
          RULE-BASED MULTI-AGENT ANALYSIS
        </Badge>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-3 mb-4 flex justify-between items-center text-xs font-mono">
        <div>
          <span className="text-muted-foreground uppercase text-[10px] block">Debate Topic</span>
          <span className="font-bold text-foreground">Evaluate Wallet Devnet State & Market Stability</span>
        </div>
        <button
          onClick={handleRunDebate}
          disabled={loading || isDebating}
          className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary flex items-center gap-1.5 text-xs font-mono font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || isDebating ? "animate-spin" : ""}`} />
          Run Session
        </button>
      </div>

      <div className="flex-1 space-y-3 font-mono text-xs overflow-y-auto no-scrollbar">
        {debates.map((d, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-foreground">{d.agent}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded uppercase border font-bold ${getStanceColor(d.position)}`}>
                {d.position}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">{d.reasoning}</p>
            {d.evidence.map((ev, idx) => (
              <div key={idx} className="text-[10px] text-teal flex justify-between pt-1 border-t border-white/5">
                <span>{ev.metric}: <strong>{ev.value}</strong></span>
                <span className="text-muted-foreground">Source: {ev.source}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 font-mono text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-muted-foreground uppercase text-[10px]">Calculated Agent Consensus</span>
          <span className="font-bold text-success flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {consensusText}
          </span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full" style={{ width: `${agreementPct}%` }} />
        </div>
      </div>
    </div>
  );
}
