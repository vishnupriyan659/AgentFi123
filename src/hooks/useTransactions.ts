import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { ActionKind } from "@/lib/intentParser";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface Transaction {
  id: string;
  signature: string;
  type: ActionKind | "unknown";
  status: TransactionStatus;
  fromToken: string;
  fromAmount: number;
  toToken: string;
  toAmount: number;
  timestamp: number;
  intent: string;
  route: string;
  networkFee: number;
  userFee: number;
  isFeePayer: boolean;
  direction: "received" | "sent" | "neutral";
  slot?: number;
}

// Explicit Judge Demo / Presentation Mode transactions (never mixed with real wallet history)
export const JUDGE_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "demo-judge-1",
    signature: "5rK9pA...solDevnetDemo1",
    type: "swap",
    status: "confirmed",
    fromToken: "USDC",
    fromAmount: 1000,
    toToken: "SOL",
    toAmount: 6.5,
    timestamp: Date.now() - 3600000 * 2,
    intent: "Swap 1000 USDC to SOL",
    route: "Jupiter V6 (Judge Demo)",
    networkFee: 0.00001,
    userFee: 0.00001,
    isFeePayer: true,
    direction: "sent"
  },
  {
    id: "demo-judge-2",
    signature: "2xL4vN...solDevnetDemo2",
    type: "buy",
    status: "confirmed",
    fromToken: "SOL",
    fromAmount: 2.5,
    toToken: "BONK",
    toAmount: 120000000,
    timestamp: Date.now() - 300000,
    intent: "Buy BONK with 2.5 SOL",
    route: "Raydium (Judge Demo)",
    networkFee: 0.00005,
    userFee: 0.00005,
    isFeePayer: true,
    direction: "sent"
  }
];

// Module-level Cache & Deduplication for RPC calls
interface TxCacheItem {
  key: string;
  data: Transaction[];
  timestamp: number;
}

const txCache = new Map<string, TxCacheItem>();
const inFlightRequests = new Map<string, Promise<Transaction[]>>();

const CACHE_TTL_MS = 60000; // 60-second cache
const POLL_INTERVAL_MS = 60000; // 60-second polling
const MANUAL_REFRESH_COOLDOWN_MS = 3000; // 3-second cooldown

/**
 * Executes RPC call with up to 3 retries using exponential backoff on HTTP 429 / Rate Limit errors.
 */
export async function rpcWithRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errStr = String(err?.message || err?.toString?.() || err || "");
      const is429 = errStr.includes("429") || errStr.toLowerCase().includes("too many requests");
      
      if (is429 && attempt <= maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1000ms, 2000ms, 4000ms
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

export function useTransactions() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const fetchDevnetTransactions = useCallback(async (isManual = false) => {
    if (!publicKey) {
      setTransactions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const pubkeyStr = publicKey.toBase58();
    const now = Date.now();

    // 1. Manual Refresh Cooldown check (3 seconds)
    if (isManual && now - lastFetchTimeRef.current < MANUAL_REFRESH_COOLDOWN_MS) {
      const cached = txCache.get(pubkeyStr);
      if (cached) {
        setTransactions(cached.data);
      }
      return;
    }

    // 2. Cache Check (60 seconds) for automatic calls
    if (!isManual) {
      const cached = txCache.get(pubkeyStr);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        setTransactions(cached.data);
        setLoading(false);
        return;
      }
    }

    // 3. Request Deduplication: Return in-flight promise if one already exists
    if (inFlightRequests.has(pubkeyStr)) {
      try {
        const list = await inFlightRequests.get(pubkeyStr)!;
        if (isMountedRef.current) {
          setTransactions(list);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError("Unable to load Devnet transactions.");
        }
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    const fetchPromise = (async (): Promise<Transaction[]> => {
      // 4. Execute RPC call with 429 exponential backoff retries
      const sigInfos = await rpcWithRateLimitRetry(() =>
        connection.getSignaturesForAddress(publicKey, { limit: 20 }, "confirmed")
      );

      if (!sigInfos || sigInfos.length === 0) {
        return [];
      }

      const signatures = sigInfos.map((s) => s.signature);
      const parsedTxs = await rpcWithRateLimitRetry(() =>
        connection.getParsedTransactions(signatures, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        })
      );

      const list: Transaction[] = [];

      for (let i = 0; i < sigInfos.length; i++) {
        const info = sigInfos[i];
        const parsed = parsedTxs[i];
        const isFailed = !!info.err || (parsed?.meta?.err != null);
        const timestamp = (parsed?.blockTime || info.blockTime || 0) * 1000 || Date.now();
        const totalFeeLamports = parsed?.meta?.fee || 0;
        const networkFee = totalFeeLamports / 1e9;
        const slot = info.slot;

        let type: ActionKind | "unknown" = "unknown";
        let intent = "Unknown transaction";
        let fromToken = "SOL";
        let fromAmount = 0;
        let toToken = "";
        let toAmount = 0;
        let direction: "received" | "sent" | "neutral" = "neutral";

        let isFeePayer = false;
        let userFee = 0;

        if (parsed?.transaction?.message?.accountKeys) {
          const keys = parsed.transaction.message.accountKeys.map((k) =>
            typeof k === "string" ? k : k.pubkey.toBase58()
          );

          const feePayerAddress = keys[0] || "";
          isFeePayer = feePayerAddress === pubkeyStr;
          userFee = isFeePayer ? networkFee : 0;

          const walletIndex = keys.indexOf(pubkeyStr);

          if (walletIndex >= 0 && parsed.meta?.preBalances && parsed.meta?.postBalances) {
            const pre = parsed.meta.preBalances[walletIndex];
            const post = parsed.meta.postBalances[walletIndex];
            const diff = post - pre;

            if (diff > 0) {
              direction = "received";
              fromAmount = diff / 1e9;
              intent = `Received ${fromAmount.toFixed(4)} SOL`;
              type = "buy";
            } else if (diff < 0) {
              const grossLoss = Math.abs(diff);
              const spentAmountLamports = isFeePayer ? Math.max(0, grossLoss - totalFeeLamports) : grossLoss;
              if (spentAmountLamports > 0) {
                direction = "sent";
                fromAmount = spentAmountLamports / 1e9;
                intent = `Sent ${fromAmount.toFixed(4)} SOL`;
                type = "send";
              } else {
                direction = "neutral";
                fromAmount = 0;
                intent = "Solana Network Transaction";
              }
            }
          }
        }

        list.push({
          id: info.signature,
          signature: info.signature,
          type,
          status: isFailed ? "failed" : "confirmed",
          fromToken,
          fromAmount,
          toToken,
          toAmount,
          timestamp,
          intent,
          route: "Solana Devnet",
          networkFee,
          userFee,
          isFeePayer,
          direction,
          slot,
        });
      }

      return list;
    })();

    inFlightRequests.set(pubkeyStr, fetchPromise);

    try {
      const list = await fetchPromise;
      lastFetchTimeRef.current = Date.now();

      // Store in 60s cache
      txCache.set(pubkeyStr, {
        key: pubkeyStr,
        data: list,
        timestamp: lastFetchTimeRef.current,
      });

      if (isMountedRef.current) {
        setTransactions(list);
        setError(null);
      }
    } catch (err: any) {
      console.warn("Devnet RPC rate limit or network warning:", err?.message || err);
      
      // Retain last successful real data during rate limiting
      const cached = txCache.get(pubkeyStr);
      if (isMountedRef.current) {
        if (cached && cached.data.length > 0) {
          setTransactions(cached.data);
          setError("Devnet RPC rate limit active. Retaining cached transaction data.");
        } else {
          setTransactions((prev) => prev);
          setError("Unable to load Devnet transactions. Retaining previous state.");
        }
      }
    } finally {
      inFlightRequests.delete(pubkeyStr);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [publicKey, connection]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDevnetTransactions(false);

    if (!publicKey) return;

    // 5. 60-Second Polling & Hidden-Tab Pause
    const interval = setInterval(() => {
      if (document.hidden) return; // Pause polling when tab is hidden
      fetchDevnetTransactions(false);
    }, POLL_INTERVAL_MS);

    // 6. Resume on Page Visibility Change
    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current) {
        const pubkeyStr = publicKey.toBase58();
        const cached = txCache.get(pubkeyStr);
        if (!cached || Date.now() - cached.timestamp >= CACHE_TTL_MS) {
          fetchDevnetTransactions(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [publicKey, fetchDevnetTransactions]);

  const handleManualRefresh = useCallback(async () => {
    await fetchDevnetTransactions(true);
  }, [fetchDevnetTransactions]);

  const addTransaction = useCallback((_tx: Omit<Transaction, "id">) => {
    fetchDevnetTransactions(true);
  }, [fetchDevnetTransactions]);

  const clearTransactions = useCallback(() => {
    if (publicKey) {
      txCache.delete(publicKey.toBase58());
    }
    setTransactions([]);
  }, [publicKey]);

  const stats = {
    total: transactions.length,
    successful: transactions.filter((t) => t.status === "confirmed").length,
    pending: transactions.filter((t) => t.status === "pending").length,
    failed: transactions.filter((t) => t.status === "failed").length,
    totalVolume: transactions
      .filter((t) => t.status === "confirmed")
      .reduce((sum, t) => sum + t.fromAmount, 0),
    last24h: transactions.filter(
      (t) => Date.now() - t.timestamp < 24 * 60 * 60 * 1000
    ).length,
  };

  return {
    transactions,
    loading,
    error,
    refresh: handleManualRefresh,
    addTransaction,
    clearTransactions,
    stats,
  };
}
