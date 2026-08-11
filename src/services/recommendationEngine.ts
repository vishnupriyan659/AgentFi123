import type { AgentFiLiveSnapshot } from "./liveSnapshotService";

export interface LiveRecommendation {
  id: string;
  category: "Fee Reserve" | "Portfolio Concentration" | "Activity Inspection" | "Protocol Reference";
  title: string;
  triggerCondition: string;
  evidence: string;
  source: string;
  timestamp: string;
  network: "Solana Devnet";
  isExecutable: boolean;
  actionType: "TRANSFER_AGENT" | "VIEW_ANALYSIS" | "NONE";
  actionText: string;
  limitations: string;
  disclaimer: "Educational observation only — not financial advice.";
}

/**
 * Generates transparent, rule-based recommendations from the live snapshot.
 */
export function generateLiveRecommendations(snapshot: AgentFiLiveSnapshot | null): LiveRecommendation[] {
  const nowIso = new Date().toISOString();

  if (!snapshot || !snapshot.wallet.connected || !snapshot.wallet.publicKey) {
    return [
      {
        id: "rec_connect_wallet",
        category: "Fee Reserve",
        title: "Connect Phantom Wallet to Evaluate RPC State",
        triggerCondition: "No wallet connected",
        evidence: "Phantom extension disconnected",
        source: "Solana Devnet RPC",
        timestamp: nowIso,
        network: "Solana Devnet",
        isExecutable: false,
        actionType: "NONE",
        actionText: "Connect Phantom Wallet",
        limitations: "Requires active Phantom browser extension.",
        disclaimer: "Educational observation only — not financial advice.",
      },
    ];
  }

  const { solBalance, balanceStatus, recentTransactions, tokenAccounts } = snapshot.wallet;
  const { solUsdPrice, change24hPercent } = snapshot.market;

  if (solBalance === 0 || balanceStatus === "zero") {
    return [
      {
        id: "rec_obtain_test_sol",
        category: "Fee Reserve",
        title: "Obtain Devnet SOL Test Funds",
        triggerCondition: "Wallet connected with exactly 0.0000 SOL",
        evidence: "Balance: 0.0000 SOL (LIVE)",
        source: "Solana Devnet RPC",
        timestamp: nowIso,
        network: "Solana Devnet",
        isExecutable: true,
        actionType: "TRANSFER_AGENT",
        actionText: "Request Devnet SOL / Prepare Transfer",
        limitations: "Devnet test funds have no real monetary value.",
        disclaimer: "Educational observation only — not financial advice.",
      },
      {
        id: "rec_protocol_ref",
        category: "Protocol Reference",
        title: "Review Verified Live Protocol Market References",
        triggerCondition: "Educational market monitoring",
        evidence: `Live SOL/USD spot price: ${solUsdPrice !== null && solUsdPrice !== undefined ? `$${solUsdPrice.toFixed(2)}` : "N/A"} (${change24hPercent !== null && change24hPercent !== undefined ? `${change24hPercent.toFixed(2)}%` : "0%"})`,
        source: "CoinGecko Market API",
        timestamp: nowIso,
        network: "Solana Devnet",
        isExecutable: false,
        actionType: "VIEW_ANALYSIS",
        actionText: "Execution not implemented on Solana Devnet",
        limitations: "Mainnet yield protocols are not executable from Solana Devnet.",
        disclaimer: "Educational observation only — not financial advice.",
      },
    ];
  }

  const recs: LiveRecommendation[] = [];

  // Rule 1: Check SOL Fee Reserve (Funded Wallet)
  if (solBalance !== null && solBalance < 0.05) {
    recs.push({
      id: "rec_fee_reserve",
      category: "Fee Reserve",
      title: "Maintain SOL Fee Reserve",
      triggerCondition: "Devnet SOL balance is below 0.05 SOL",
      evidence: `Current balance is ${solBalance.toFixed(4)} SOL.`,
      source: "Solana Devnet RPC",
      timestamp: nowIso,
      network: "Solana Devnet",
      isExecutable: true,
      actionType: "TRANSFER_AGENT",
      actionText: "Prepare Supported Transfer",
      limitations: "Devnet SOL test funds only; maximum transfer cap is 0.05 SOL.",
      disclaimer: "Educational observation only — not financial advice.",
    });
  }

  // Rule 2: Check Asset Concentration (Only when solBalance > 0)
  if (solBalance !== null && solBalance > 0 && tokenAccounts.length === 0) {
    recs.push({
      id: "rec_concentration",
      category: "Portfolio Concentration",
      title: "Review Single-Asset Wallet Concentration",
      triggerCondition: "Wallet holds 100% of holdings in SOL",
      evidence: `100% of visible holdings are native SOL (${solBalance.toFixed(4)} SOL).`,
      source: "Solana Devnet RPC",
      timestamp: nowIso,
      network: "Solana Devnet",
      isExecutable: false,
      actionType: "VIEW_ANALYSIS",
      actionText: "Execution not implemented on Solana Devnet",
      limitations: "Swaps and token minting are disabled on Devnet.",
      disclaimer: "Educational observation only — not financial advice.",
    });
  }

  // Rule 3: Check Failed Recent Transactions
  const failedTxs = recentTransactions.filter((t) => t.status === "failed");
  if (failedTxs.length > 0) {
    recs.push({
      id: "rec_failed_tx",
      category: "Activity Inspection",
      title: "Inspect Failed Recent Transaction Signatures",
      triggerCondition: `${failedTxs.length} failed transaction(s) found in recent history`,
      evidence: `Latest failed signature: ${failedTxs[0].signature.slice(0, 10)}…`,
      source: "Solana Devnet RPC",
      timestamp: nowIso,
      network: "Solana Devnet",
      isExecutable: false,
      actionType: "VIEW_ANALYSIS",
      actionText: "Open Transaction History",
      limitations: "Devnet RPC signature query limit is 10 transactions.",
      disclaimer: "Educational observation only — not financial advice.",
    });
  }

  // Rule 4: Protocol Yield Reference
  recs.push({
    id: "rec_protocol_ref",
    category: "Protocol Reference",
    title: "Review Verified Live Protocol Market References",
    triggerCondition: "Educational market monitoring",
    evidence: `Live SOL/USD spot price: ${solUsdPrice !== null && solUsdPrice !== undefined ? `$${solUsdPrice.toFixed(2)}` : "N/A"} (${change24hPercent !== null && change24hPercent !== undefined ? `${change24hPercent.toFixed(2)}%` : "0%"})`,
    source: "CoinGecko Market API",
    timestamp: nowIso,
    network: "Solana Devnet",
    isExecutable: false,
    actionType: "VIEW_ANALYSIS",
    actionText: "Execution not implemented on Solana Devnet",
    limitations: "Mainnet yield protocols are not executable from Solana Devnet.",
    disclaimer: "Educational observation only — not financial advice.",
  });

  return recs;
}
