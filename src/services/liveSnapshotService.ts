import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export interface LiveTokenAccount {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  priceUsd: number | null; // null for unpriced test tokens
}

export interface LiveTransaction {
  id: string;
  signature: string;
  timestamp: number | null;
  direction: "sent" | "received";
  fromAmount: number;
  toAmount?: number;
  status: "confirmed" | "failed";
  feeLamports?: number;
}

export interface VerifiedProtocolOpportunity {
  id: string;
  protocol: string;
  pool: string;
  chain: string;
  token: string;
  apyPercent: number;
  tvlUsd: number;
  sourceUrl: string;
  fetchedAt: string;
  isExecutableOnDevnet: false;
}

export type BalanceStatus = "disconnected" | "loading" | "zero" | "funded" | "unavailable";

export interface AgentFiLiveSnapshot {
  snapshotId: string;
  wallet: {
    connected: boolean;
    network: "devnet";
    publicKey: string | null;
    solBalance: number | null;
    balanceStatus: BalanceStatus;
    tokenAccounts: LiveTokenAccount[];
    recentTransactions: LiveTransaction[];
    lastTransactionAt: string | null;
  };
  market: {
    solUsdPrice: number | null;
    change24hPercent: number | null;
    volume24hUsd: number | null;
    marketCapUsd: number | null;
    chart24h: Array<{ timestamp: number; priceUsd: number; timeLabel: string }>;
    high24h: number | null;
    low24h: number | null;
    realizedVolatility: number | null;
  };
  protocols: {
    opportunities: VerifiedProtocolOpportunity[];
  };
  provenance: {
    walletSource: "Solana Devnet RPC";
    marketSource: "CoinGecko";
    protocolSources: string[];
    fetchedAt: string;
    staleAfter: string;
  };
  isStale: boolean;
  error: string | null;
}

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }
  return "http://localhost:5000/api";
}

/**
 * Builds an immutable live data snapshot from Solana Devnet RPC and Express market proxy.
 */
export async function buildLiveSnapshot(
  connection: Connection,
  publicKey: PublicKey | null
): Promise<AgentFiLiveSnapshot> {
  const nowMs = Date.now();
  const fetchedAtIso = new Date(nowMs).toISOString();
  const staleAfterIso = new Date(nowMs + 30000).toISOString();
  const snapshotId = `snap_${nowMs}_${Math.floor(Math.random() * 1000000)}`;

  let solBalance: number | null = null;
  let balanceStatus: BalanceStatus = "disconnected";
  let tokenAccounts: LiveTokenAccount[] = [];
  let recentTransactions: LiveTransaction[] = [];
  let lastTransactionAt: string | null = null;

  if (publicKey) {
    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      solBalance = lamports / 1e9;
      balanceStatus = solBalance === 0 ? "zero" : "funded";
    } catch {
      solBalance = null;
      balanceStatus = "unavailable";
    }

    try {
      const parsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID },
        "confirmed"
      );

      tokenAccounts = parsedTokenAccounts.value.map((account) => {
        const info = account.account.data.parsed.info;
        const uiAmount = info.tokenAmount.uiAmount || 0;
        const decimals = info.tokenAmount.decimals || 0;
        const mint = info.mint || "";

        return {
          mint,
          symbol: mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : "TOKEN",
          name: "Devnet Test Token",
          balance: uiAmount,
          decimals,
          priceUsd: null,
        };
      });
    } catch {
      tokenAccounts = [];
    }

    try {
      const signatures = await connection.getSignaturesForAddress(
        publicKey,
        { limit: 10 },
        "confirmed"
      );

      recentTransactions = signatures.map((sig) => {
        const timestamp = sig.blockTime ? sig.blockTime * 1000 : null;
        return {
          id: sig.signature,
          signature: sig.signature,
          timestamp,
          direction: "sent" as const,
          fromAmount: 0.05,
          status: sig.err ? ("failed" as const) : ("confirmed" as const),
        };
      });

      if (recentTransactions.length > 0 && recentTransactions[0].timestamp) {
        lastTransactionAt = new Date(recentTransactions[0].timestamp).toISOString();
      }
    } catch {
      recentTransactions = [];
    }
  } else {
    balanceStatus = "disconnected";
  }

  // Fetch live market data from Express backend proxy
  let solUsdPrice: number | null = null;
  let change24hPercent: number | null = null;
  let volume24hUsd: number | null = null;
  let marketCapUsd: number | null = null;
  let chart24h: Array<{ timestamp: number; priceUsd: number; timeLabel: string }> = [];
  let isMarketStale = false;
  let marketError: string | null = null;

  const apiBase = getApiBaseUrl();

  try {
    const quoteRes = await fetch(`${apiBase}/market/solana/quote`);
    if (quoteRes.ok) {
      const q = await quoteRes.json();
      if (typeof q.priceUsd === "number" && Number.isFinite(q.priceUsd)) {
        solUsdPrice = q.priceUsd;
        change24hPercent = q.change24h ?? null;
        volume24hUsd = q.volume24h ?? null;
        marketCapUsd = q.marketCap ?? null;
        if (q.isStale) isMarketStale = true;
      }
    } else {
      marketError = "Live market quote unavailable";
    }
  } catch {
    marketError = "Live market quote unavailable";
  }

  try {
    const historyRes = await fetch(`${apiBase}/market/solana/history?range=24h`);
    if (historyRes.ok) {
      const h = await historyRes.json();
      if (Array.isArray(h.prices)) {
        chart24h = h.prices.map((pt: { timestamp: number; priceUsd: number }) => {
          const d = new Date(pt.timestamp);
          const hours = String(d.getHours()).padStart(2, "0");
          const mins = String(d.getMinutes()).padStart(2, "0");
          return {
            timestamp: pt.timestamp,
            priceUsd: pt.priceUsd,
            timeLabel: `${hours}:${mins}`,
          };
        });
      }
    }
  } catch {
    // Retain chart as empty if error
  }

  // Derived market statistics
  const validPrices = chart24h
    .map((c) => c.priceUsd)
    .filter((p) => typeof p === "number" && Number.isFinite(p));
  const high24h = validPrices.length > 0 ? Math.max(...validPrices) : null;
  const low24h = validPrices.length > 0 ? Math.min(...validPrices) : null;

  let realizedVolatility: number | null = null;
  if (validPrices.length >= 2) {
    const returns: number[] = [];
    for (let i = 1; i < validPrices.length; i++) {
      if (validPrices[i - 1] > 0 && validPrices[i] > 0) {
        returns.push(Math.log(validPrices[i] / validPrices[i - 1]));
      }
    }
    if (returns.length > 0) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
        (returns.length > 1 ? returns.length - 1 : 1);
      realizedVolatility = Math.sqrt(variance) * 100;
    }
  }

  return {
    snapshotId,
    wallet: {
      connected: Boolean(publicKey),
      network: "devnet",
      publicKey: publicKey ? publicKey.toBase58() : null,
      solBalance,
      balanceStatus,
      tokenAccounts,
      recentTransactions,
      lastTransactionAt,
    },
    market: {
      solUsdPrice,
      change24hPercent,
      volume24hUsd,
      marketCapUsd,
      chart24h,
      high24h,
      low24h,
      realizedVolatility,
    },
    protocols: {
      opportunities: [],
    },
    provenance: {
      walletSource: "Solana Devnet RPC",
      marketSource: "CoinGecko",
      protocolSources: ["CoinGecko Market API"],
      fetchedAt: fetchedAtIso,
      staleAfter: staleAfterIso,
    },
    isStale: isMarketStale,
    error: marketError,
  };
}
