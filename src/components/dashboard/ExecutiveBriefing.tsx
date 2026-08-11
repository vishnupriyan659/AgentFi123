import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolBalance } from "@/hooks/useSolBalance";
import { Sparkles, Activity } from "lucide-react";

export function ExecutiveBriefing() {
  const { publicKey, connected } = useWallet();
  const { balance } = useSolBalance();
  const [displayName, setDisplayName] = useState<string | null>(() => localStorage.getItem("agentfi_display_name"));

  useEffect(() => {
    const updateName = () => {
      setDisplayName(localStorage.getItem("agentfi_display_name"));
    };
    window.addEventListener("storage", updateName);
    window.addEventListener("agentfi_name_changed", updateName);
    return () => {
      window.removeEventListener("storage", updateName);
      window.removeEventListener("agentfi_name_changed", updateName);
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const userGreetingName = displayName && displayName.trim()
    ? displayName.trim()
    : publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "Investor";

  const isConnectedAndFunded = connected && balance !== null && balance > 0;
  const isConnectedAndEmpty = connected && (balance === null || balance === 0);

  // Dynamic values strictly aligned to Fix 5B & Fix 6 truthfulness rules
  const healthScoreDisplay = "N/A";
  const riskLevelDisplay = isConnectedAndFunded ? "Analysis required" : "N/A";
  const marketOutlookDisplay = "Awaiting live market data";
  
  const totalValueDisplay = !connected
    ? "—"
    : balance !== null
    ? `${balance.toFixed(3)} SOL`
    : "Loading wallet balance...";

  // Recommendation title & reasoning
  let cardBadgeLabel = "OPPORTUNITY";
  let recTitle = "Connect Phantom Wallet";
  let recReasoning = "Connect your Phantom wallet on Solana Devnet to view holdings and submit natural language intents.";
  let expectedImpact = "N/A";
  let buttonLabel = "Connect Wallet";

  if (connected && isConnectedAndEmpty) {
    cardBadgeLabel = "SETUP REQUIRED";
    recTitle = "Devnet Test SOL Required";
    recReasoning = "Your wallet is connected to Solana Devnet with a balance of 0.000 SOL. Add free test SOL to test wallet transfers and transaction tracking.";
    expectedImpact = "N/A";
    buttonLabel = "Devnet SOL Required";
  } else if (isConnectedAndFunded) {
    cardBadgeLabel = "LIVE WALLET";
    recTitle = "No verified strategy available yet";
    recReasoning = `Connected to Devnet with ${balance?.toFixed(3)} SOL. Enter a natural language intent or run a strategy simulation to generate a verified execution proposal.`;
    expectedImpact = "Awaiting Intent";
    buttonLabel = "Analysis Required";
  }

  return (
    <div className="glass-panel border border-primary/30 rounded-3xl p-8 bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden shadow-[0_0_40px_rgba(124,92,252,0.15)]">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Sparkles className="w-48 h-48 text-primary animate-pulse" />
      </div>

      <div className="relative z-10">
        <h2 className="font-display text-2xl font-bold mb-6">
          {getGreeting()}, <span className="text-primary font-mono">{userGreetingName}</span>.
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="border-l-2 border-primary pl-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Portfolio Health</span>
            <div className="text-3xl font-display font-bold mt-1">
              {healthScoreDisplay}
            </div>
          </div>
          <div className="border-l-2 border-warning pl-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Risk Level</span>
            <div className="text-lg font-display font-bold text-warning mt-2">{riskLevelDisplay}</div>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Market Outlook</span>
            <div className="text-xs font-display font-semibold text-muted-foreground mt-2">
              {marketOutlookDisplay}
            </div>
          </div>
          <div className="border-l-2 border-primary pl-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Value</span>
            <div className="text-2xl font-display font-bold mt-1 font-mono">{totalValueDisplay}</div>
          </div>
        </div>

        <div className="bg-background/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary/20 text-primary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                {cardBadgeLabel}
              </span>
              {isConnectedAndFunded && (
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Live Devnet Wallet
                </span>
              )}
            </div>
            <h4 className="text-xl font-bold mb-1">{recTitle}</h4>
            <p className="text-sm text-muted-foreground max-w-xl">{recReasoning}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
              Expected Benefit: {expectedImpact}
            </span>
            <button 
              disabled={true}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/10 text-muted-foreground cursor-not-allowed border border-white/10 opacity-70"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
