import { useState, useEffect, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { buildLiveSnapshot, type AgentFiLiveSnapshot } from "@/services/liveSnapshotService";

export interface UseLiveSnapshotReturn {
  snapshot: AgentFiLiveSnapshot | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refresh: () => Promise<void>;
}

export function useLiveSnapshot(): UseLiveSnapshotReturn {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [snapshot, setSnapshot] = useState<AgentFiLiveSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const currentKeyRef = useRef<string | null>(null);

  const pubkeyStr = publicKey ? publicKey.toBase58() : null;

  const fetchSnapshot = useCallback(async (isManual = false) => {
    if (!isMountedRef.current) return;
    if (isManual || !snapshot) setLoading(true);

    const targetKey = pubkeyStr;

    try {
      const snap = await buildLiveSnapshot(connection, publicKey);
      if (!isMountedRef.current) return;

      // Ignore response if account changed mid-fetch
      if (currentKeyRef.current !== targetKey) return;

      setSnapshot(snap);
      setIsStale(snap.isStale);
      setError(snap.error);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (currentKeyRef.current !== targetKey) return;

      const errMsg = err instanceof Error ? err.message : "Failed to build live snapshot";
      if (snapshot) {
        setIsStale(true);
      } else {
        setError(errMsg);
      }
    } finally {
      if (isMountedRef.current && currentKeyRef.current === targetKey) {
        setLoading(false);
      }
    }
  }, [connection, publicKey, pubkeyStr, snapshot]);

  useEffect(() => {
    isMountedRef.current = true;
    currentKeyRef.current = pubkeyStr;

    // Requirement 7: Immediately clear previous snapshot on account change or disconnect
    setSnapshot(null);
    setLoading(true);

    fetchSnapshot(true);

    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchSnapshot(false);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [connected, pubkeyStr]);

  const handleRefresh = useCallback(async () => {
    await fetchSnapshot(true);
  }, [fetchSnapshot]);

  return {
    snapshot,
    loading,
    error,
    isStale,
    refresh: handleRefresh,
  };
}
