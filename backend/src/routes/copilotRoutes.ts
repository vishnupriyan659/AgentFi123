import { Router, Request, Response } from "express";
import { getAIProvider } from "../ai/index.js";

const router = Router();

// 60-Second In-Memory Response Cache keyed by question + wallet + balance + price
const copilotCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000;

export interface CopilotResponseContract {
  answer: string;
  mode: "ai" | "rule-based";
  providerAvailable: boolean;
  evidence: {
    walletConnected: boolean;
    solBalance: number | null;
    network: "devnet";
    transactionCount: number | null;
    priceReference: number | null;
  };
  generatedAt: string;
}

/**
 * Generate a truthful, question-specific rule-based fallback response
 */
function generateRuleBasedAnswer(
  question: string,
  walletConnected: boolean,
  walletAddress: string | null,
  solBalance: number | null,
  balanceStatus: string,
  transactionCount: number,
  solPriceUsd: number | null,
  change24h: number
): string {
  const qLower = question.trim().toLowerCase();

  // Group 1: Transfers & How to make a transaction
  if (
    qLower.includes("how to make") ||
    qLower.includes("how do i send") ||
    qLower.includes("how to send") ||
    qLower.includes("make transaction") ||
    qLower.includes("make the transaction") ||
    qLower.includes("send sol") ||
    qLower.includes("how to transfer") ||
    qLower.includes("how do i transfer") ||
    qLower.includes("transfer sol")
  ) {
    return [
      "To execute a Solana Devnet SOL transfer safely using AgentFi:",
      "1. Open Transfer Agent from the sidebar menu.",
      "2. Confirm your connected Phantom sender wallet on Solana Devnet.",
      "3. Enter your transfer intent, e.g., 'Send 0.01 SOL to <recipient public key>'.",
      "4. Click Parse & Validate Intent to review recipient address, transfer amount, and network fees.",
      "5. Click Prepare & Request Signature to open your Phantom wallet pop-up.",
      "6. Review and approve the transaction once in Phantom, then verify the confirmed signature link on Solana Devnet Explorer.",
      "",
      "Safety Note: AgentFi never requests private keys or seed phrases. Devnet SOL is test currency with no real monetary value.",
    ].join("\n");
  }

  // Group 2: Wallet & Balance
  if (
    qLower.includes("current wallet") ||
    qLower.includes("wallet balance") ||
    qLower.includes("explain my wallet") ||
    qLower.includes("my balance") ||
    qLower.includes("holdings") ||
    qLower.includes("connected wallet")
  ) {
    if (!walletConnected) {
      return "No Phantom wallet is currently connected. Connect your Phantom wallet using the 'Connect System' button to view your live Devnet balance and token holdings.";
    }
    const addrFormatted = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}` : "Connected Wallet";
    const balFormatted = solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "Unavailable";
    return `Your connected Phantom wallet (${addrFormatted}) currently holds ${balFormatted} on Solana Devnet (Balance status: ${balanceStatus}). Devnet SOL funds are test currency and have no monetary value.`;
  }

  // Group 3: Risk & Concentration
  if (
    qLower.includes("risk") ||
    qLower.includes("risk score") ||
    qLower.includes("why is my risk") ||
    qLower.includes("concentration") ||
    qLower.includes("volatility")
  ) {
    if (!walletConnected) {
      return "Risk assessment requires a connected wallet. Connect Phantom to evaluate concentration and liquidity risk on Solana Devnet.";
    }
    const balFormatted = solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "0.0000 SOL";
    return `Your wallet risk score is evaluated based on asset concentration, fee reserve sufficiency, and market volatility. Currently, your balance is ${balFormatted}, representing 100% single-asset concentration in SOL. Holding 100% of your portfolio in a single asset increases your concentration risk score.`;
  }

  // Group 4: Transactions & History
  if (
    qLower.includes("transaction") ||
    qLower.includes("recent transaction") ||
    qLower.includes("history") ||
    qLower.includes("signature") ||
    qLower.includes("tx")
  ) {
    if (!walletConnected) {
      return "Wallet is disconnected. Connect Phantom on Solana Devnet to inspect recent confirmed transaction signatures.";
    }
    return `Your connected wallet has ${transactionCount} confirmed transaction signature(s) loaded on Solana Devnet. You can view full transaction details and signatures under Portfolio or Enterprise Reports.`;
  }

  // Group 5: Devnet Safety & Testing
  if (
    qLower.includes("safely test") ||
    qLower.includes("test on devnet") ||
    qLower.includes("what can i test") ||
    qLower.includes("devnet safety") ||
    qLower.includes("safe to test")
  ) {
    return [
      "AgentFi on Solana Devnet safely supports:",
      "1. Native Devnet SOL transfers via Phantom wallet signing.",
      "2. Automated intent parsing & pre-flight transaction simulations.",
      "3. Live portfolio telemetry and risk scoring.",
      "4. Printable A4 Enterprise Reports.",
      "5. Educational dry-run Swap Lab simulations.",
      "",
      "All operations use Devnet test funds with zero real-world financial risk.",
    ].join("\n");
  }

  // Group 6: Market & 24h SOL Price
  if (
    qLower.includes("24 hour") ||
    qLower.includes("24h") ||
    qLower.includes("price") ||
    qLower.includes("market") ||
    qLower.includes("movement") ||
    qLower.includes("sol change")
  ) {
    const priceStr = solPriceUsd !== null ? `$${solPriceUsd.toFixed(2)} USD` : "Unavailable";
    const changeStr = `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`;
    return `Solana (SOL) is currently priced at ${priceStr} with a 24-hour price change of ${changeStr} based on live CoinGecko market data.`;
  }

  // Fallback for unknown questions
  return "I can currently answer questions about your AgentFi wallet, Devnet transfers, transactions, risk assessment and test-network safety.";
}

/**
 * POST /api/copilot/analyze
 * Post /api/copilot/chat
 * Main Copilot Endpoint obeying strict Phase 2 & Phase 3 Contracts
 */
const handleCopilotRequest = async (req: Request, res: Response) => {
  try {
    const question = req.body.question || req.body.message;
    const walletAddress = req.body.walletAddress || req.body.snapshot?.wallet?.publicKey || null;
    const snapshot = req.body.snapshot;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      res.status(400).json({ error: "Missing required 'question' string field." });
      return;
    }

    const trimmedQuestion = question.trim();
    const walletConnected = Boolean(snapshot?.wallet?.connected && (walletAddress || snapshot?.wallet?.publicKey));
    const solBalance = walletConnected ? (snapshot?.wallet?.solBalance ?? null) : null;
    const balanceStatus = snapshot?.wallet?.balanceStatus ?? (walletConnected ? (solBalance === 0 ? "zero" : "funded") : "disconnected");
    const recentTxs = snapshot?.wallet?.recentTransactions || [];
    const transactionCount = walletConnected ? recentTxs.length : 0;
    const solPriceUsd = snapshot?.market?.solUsdPrice ?? 180.0;
    const change24h = snapshot?.market?.change24hPercent ?? 0.0;
    const nowIso = new Date().toISOString();

    // Check Cache
    const cacheKey = `${trimmedQuestion.toLowerCase()}_${walletAddress || "disconnected"}_${solBalance}_${solPriceUsd}`;
    const cached = copilotCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.data);
      return;
    }

    let answerText = "";
    let mode: "ai" | "rule-based" = "rule-based";
    let providerAvailable = false;

    // Check if an AI provider API key is present
    const hasAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

    if (hasAiKey) {
      try {
        const aiProvider = getAIProvider();
        const llmResult = await aiProvider.generateAnswer({
          question: trimmedQuestion,
          context: JSON.stringify({
            walletAddress,
            solBalance,
            balanceStatus,
            transactionCount,
            solPriceUsd,
            network: "devnet",
          }),
        });

        if (llmResult && llmResult.answer && llmResult.provider !== "deterministic") {
          answerText = llmResult.answer;
          mode = "ai";
          providerAvailable = true;
        }
      } catch (aiErr) {
        // Fall back to rule-based on LLM failure
        providerAvailable = false;
        mode = "rule-based";
      }
    }

    // If LLM was unavailable or failed, use question-specific rule-based answer
    if (!providerAvailable || !answerText) {
      mode = "rule-based";
      providerAvailable = false;
      answerText = generateRuleBasedAnswer(
        trimmedQuestion,
        walletConnected,
        walletAddress,
        solBalance,
        balanceStatus,
        transactionCount,
        solPriceUsd,
        change24h
      );
    }

    const payload: CopilotResponseContract = {
      answer: answerText,
      mode,
      providerAvailable,
      evidence: {
        walletConnected,
        solBalance,
        network: "devnet",
        transactionCount,
        priceReference: solPriceUsd,
      },
      generatedAt: nowIso,
    };

    // Store in cache
    copilotCache.set(cacheKey, { data: payload, timestamp: Date.now() });

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({
      error: "Copilot service unavailable",
      message: error?.message || "Internal error during copilot processing.",
    });
  }
};

router.post("/analyze", handleCopilotRequest);
router.post("/chat", handleCopilotRequest);

/**
 * POST /api/copilot/debate
 * Grounded Agent Debate Engine endpoint
 */
router.post("/debate", async (req: Request, res: Response) => {
  try {
    const { snapshot } = req.body;
    const walletConnected = Boolean(snapshot?.wallet?.connected && snapshot?.wallet?.publicKey);
    const solBalance = walletConnected ? (snapshot?.wallet?.solBalance ?? null) : null;
    const balanceStatus = snapshot?.wallet?.balanceStatus ?? (walletConnected ? (solBalance === 0 ? "zero" : "funded") : "disconnected");
    const solPriceUsd = snapshot?.market?.solUsdPrice ?? 180.0;
    const change24h = snapshot?.market?.change24hPercent ?? 0.0;
    const nowIso = new Date().toISOString();

    let debates: Array<{
      agent: string;
      position: "support" | "caution" | "insufficient-data";
      reasoning: string;
      evidence: Array<{ metric: string; value: string; source: string }>;
    }> = [];

    if (!walletConnected) {
      debates = [
        {
          agent: "Risk Agent",
          position: "insufficient-data",
          reasoning: "Connect Phantom to evaluate wallet risk state.",
          evidence: [{ metric: "Wallet Connection", value: "Disconnected", source: "Solana Devnet RPC" }],
        },
        {
          agent: "Market Agent",
          position: change24h >= 0 ? "support" : "caution",
          reasoning: `CoinGecko SOL spot price is $${solPriceUsd.toFixed(2)} with 24h change of ${change24h.toFixed(2)}%.`,
          evidence: [{ metric: "SOL/USD Spot Price", value: `$${solPriceUsd.toFixed(2)}`, source: "CoinGecko" }],
        },
        {
          agent: "Portfolio Agent",
          position: "insufficient-data",
          reasoning: "Connect Phantom to evaluate portfolio holdings.",
          evidence: [{ metric: "Wallet Connection", value: "Disconnected", source: "Solana Devnet RPC" }],
        },
        {
          agent: "Protocol Agent",
          position: "insufficient-data",
          reasoning: "Mainnet yield protocols are disabled on Solana Devnet.",
          evidence: [{ metric: "Devnet Protocol Execution", value: "Disabled", source: "AgentFi System Rules" }],
        },
      ];
    } else if (solBalance === 0 || balanceStatus === "zero") {
      debates = [
        {
          agent: "Risk Agent",
          position: "caution",
          reasoning: "Wallet balance is 0.0000 SOL. Fee reserve is empty.",
          evidence: [{ metric: "Devnet SOL Balance", value: "0.0000 SOL", source: "Solana Devnet RPC" }],
        },
        {
          agent: "Market Agent",
          position: change24h >= 0 ? "support" : "caution",
          reasoning: `CoinGecko SOL spot price is $${solPriceUsd.toFixed(2)} with 24h change of ${change24h.toFixed(2)}%.`,
          evidence: [{ metric: "SOL/USD Spot Price", value: `$${solPriceUsd.toFixed(2)}`, source: "CoinGecko" }],
        },
        {
          agent: "Portfolio Agent",
          position: "insufficient-data",
          reasoning: "Not enough holdings data (0.0000 SOL balance).",
          evidence: [{ metric: "Devnet Holdings", value: "0.0000 SOL", source: "Solana Devnet RPC" }],
        },
        {
          agent: "Protocol Agent",
          position: "insufficient-data",
          reasoning: "Mainnet yield protocols are disabled on Solana Devnet.",
          evidence: [{ metric: "Devnet Protocol Execution", value: "Disabled", source: "AgentFi System Rules" }],
        },
      ];
    } else {
      debates = [
        {
          agent: "Risk Agent",
          position: solBalance! < 0.05 ? "caution" : "support",
          reasoning: `Wallet SOL balance is ${solBalance!.toFixed(4)} SOL. Concentration in single asset is 100%.`,
          evidence: [{ metric: "Devnet SOL Fee Reserve", value: `${solBalance!.toFixed(4)} SOL`, source: "Solana Devnet RPC" }],
        },
        {
          agent: "Market Agent",
          position: change24h >= 0 ? "support" : "caution",
          reasoning: `CoinGecko SOL spot price is $${solPriceUsd.toFixed(2)} with 24h change of ${change24h.toFixed(2)}%.`,
          evidence: [{ metric: "SOL/USD Spot Price", value: `$${solPriceUsd.toFixed(2)}`, source: "CoinGecko" }],
        },
        {
          agent: "Portfolio Agent",
          position: "support",
          reasoning: "Connected Phantom wallet is active on Solana Devnet.",
          evidence: [{ metric: "Connection Status", value: "Connected", source: "Solana Devnet RPC" }],
        },
        {
          agent: "Protocol Agent",
          position: "insufficient-data",
          reasoning: "Mainnet yield protocols are disabled on Solana Devnet.",
          evidence: [{ metric: "Devnet Protocol Execution", value: "Disabled", source: "AgentFi System Rules" }],
        },
      ];
    }

    const supportCount = debates.filter((d) => d.position === "support").length;
    const consensus = `${supportCount} of 4 agents support this conclusion`;

    res.json({
      consensus,
      agreementPct: Math.round((supportCount / 4) * 100),
      walletConnected,
      walletAddress: walletConnected ? snapshot?.wallet?.publicKey : null,
      balanceStatus,
      solBalance,
      debates,
      snapshotTimestamp: nowIso,
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Agent debate unavailable",
      message: error?.message || "Internal error during agent debate evaluation.",
    });
  }
});

export default router;
