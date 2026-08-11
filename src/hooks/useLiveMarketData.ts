import { useState, useEffect, useRef, useCallback } from "react";

export interface SolQuoteData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  provider: string;
  updatedAt: number;
  isStale?: boolean;
}

export interface SolHistoryPoint {
  timestamp: number;
  priceUsd: number;
  timeLabel: string;
}

export interface UseLiveMarketDataReturn {
  quote: SolQuoteData | null;
  history: SolHistoryPoint[];
  range: "1h" | "24h" | "7d";
  setRange: (r: "1h" | "24h" | "7d") => void;
  loading: boolean;
  chartLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isStale: boolean;
  refresh: () => Promise<void>;
}

const QUOTE_POLL_MS = 30000; // 30 seconds
const HISTORY_POLL_MS = 300000; // 5 minutes

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }
  return "http://localhost:5000/api";
}

export function useLiveMarketData(): UseLiveMarketDataReturn {
  const [quote, setQuote] = useState<SolQuoteData | null>(null);
  const [history, setHistory] = useState<SolHistoryPoint[]>([]);
  const [range, setRange] = useState<"1h" | "24h" | "7d">("24h");
  const [loading, setLoading] = useState<boolean>(true);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQuote = useCallback(async (signal?: AbortSignal): Promise<SolQuoteData> => {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/market/solana/quote`, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch market quote`);
    }
    const json = await res.json();
    if (!json || typeof json.priceUsd !== "number" || !Number.isFinite(json.priceUsd)) {
      throw new Error("Invalid quote payload received");
    }
    return json;
  }, []);

  const fetchHistory = useCallback(async (selectedRange: string, signal?: AbortSignal): Promise<SolHistoryPoint[]> => {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/market/solana/history?range=${selectedRange}`, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch market history`);
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.prices)) {
      throw new Error("Invalid history payload received");
    }

    return json.prices.map((pt: { timestamp: number; priceUsd: number }) => {
      const d = new Date(pt.timestamp);
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const timeLabel = selectedRange === "7d" ? `${d.getMonth() + 1}/${d.getDate()} ${hours}:${mins}` : `${hours}:${mins}`;
      return {
        timestamp: pt.timestamp,
        priceUsd: pt.priceUsd,
        timeLabel,
      };
    });
  }, []);

  const loadAll = useCallback(async (targetRange: "1h" | "24h" | "7d" = range, isManual = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isManual || !quote) setLoading(true);
    setChartLoading(true);

    try {
      const [quoteRes, historyRes] = await Promise.allSettled([
        fetchQuote(controller.signal),
        fetchHistory(targetRange, controller.signal),
      ]);

      if (controller.signal.aborted) return;

      if (quoteRes.status === "fulfilled") {
        setQuote(quoteRes.value);
        setIsStale(Boolean(quoteRes.value.isStale));
        setError(null);
      } else {
        if (quote) {
          setIsStale(true);
        } else {
          setError("Live market data unavailable");
        }
      }

      if (historyRes.status === "fulfilled") {
        setHistory(historyRes.value);
      }
    } catch {
      if (controller.signal.aborted) return;
      if (quote) {
        setIsStale(true);
      } else {
        setError("Live market data unavailable");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setChartLoading(false);
      }
    }
  }, [fetchQuote, fetchHistory, range, quote]);

  useEffect(() => {
    let mounted = true;

    loadAll(range);

    const quoteTimer = setInterval(async () => {
      if (!mounted) return;
      try {
        const q = await fetchQuote();
        if (!mounted) return;
        setQuote(q);
        setIsStale(Boolean(q.isStale));
        setError(null);
      } catch {
        if (!mounted) return;
        setIsStale(true);
      }
    }, QUOTE_POLL_MS);

    const historyTimer = setInterval(async () => {
      if (!mounted) return;
      try {
        const h = await fetchHistory(range);
        if (!mounted) return;
        setHistory(h);
      } catch {
        // retain previous history on temporary failure
      }
    }, HISTORY_POLL_MS);

    return () => {
      mounted = false;
      clearInterval(quoteTimer);
      clearInterval(historyTimer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [range, fetchQuote, fetchHistory]);

  const handleSetRange = (r: "1h" | "24h" | "7d") => {
    setRange(r);
    loadAll(r, false);
  };

  const handleRefresh = async () => {
    await loadAll(range, true);
  };

  return {
    quote,
    history,
    range,
    setRange: handleSetRange,
    loading,
    chartLoading,
    error,
    lastUpdated: quote?.updatedAt ?? null,
    isStale,
    refresh: handleRefresh,
  };
}
