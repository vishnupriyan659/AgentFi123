import { useEffect, useState, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { rpcWithRateLimitRetry } from "./useTransactions";

export function useSolBalance(pollMs = 60000) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const lastSuccessBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      setLoading(false);
      lastSuccessBalanceRef.current = null;
      return;
    }

    setLoading(true);
    let cancelled = false;
    const currentKeyStr = publicKey.toBase58();
    let subId: number | null = null;

    const fetchBalance = async () => {
      if (document.hidden) return; // Pause polling when tab is hidden

      try {
        const lamports = await rpcWithRateLimitRetry(() =>
          connection.getBalance(publicKey, "confirmed")
        );
        
        if (!cancelled && publicKey.toBase58() === currentKeyStr) {
          const solVal = lamports / LAMPORTS_PER_SOL;
          setBalance(solVal);
          lastSuccessBalanceRef.current = solVal;
        }
      } catch (err: any) {
        if (!cancelled && publicKey.toBase58() === currentKeyStr) {
          // Retain last successful balance during RPC rate limiting
          if (lastSuccessBalanceRef.current !== null) {
            setBalance(lastSuccessBalanceRef.current);
          } else {
            setBalance(0);
          }
        }
      } finally {
        if (!cancelled && publicKey.toBase58() === currentKeyStr) {
          setLoading(false);
        }
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, pollMs);

    // Live subscription for real-time updates
    try {
      subId = connection.onAccountChange(
        publicKey,
        (acc) => {
          if (!cancelled && publicKey.toBase58() === currentKeyStr) {
            const val = acc.lamports / LAMPORTS_PER_SOL;
            setBalance(val);
            lastSuccessBalanceRef.current = val;
          }
        },
        "confirmed",
      );
    } catch {
      /* ignore */
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (subId !== null) {
        connection.removeAccountChangeListener(subId).catch(() => {});
      }
    };
  }, [connection, publicKey, pollMs]);

  return { balance, loading };
}
