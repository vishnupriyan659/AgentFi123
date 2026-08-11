import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchLiveSolHeadlineData,
  fetchLiveSolChartData,
  type SolHeadlineMarketData,
  type SolChartPoint,
} from "@/services/marketDataService";

export interface UseLiveSolMarketDataReturn {
  data: SolHeadlineMarketData | null;
  chartData: SolChartPoint[];
  loading: boolean;
  chartLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isStale: boolean;
  refresh: () => Promise<void>;
}

const HEADLINE_POLL_MS = 30000; // 30 seconds
const CHART_POLL_MS = 300000; // 5 minutes

export function useLiveSolMarketData(): UseLiveSolMarketDataReturn {
  const [data, setData] = useState<SolHeadlineMarketData | null>(null);
  const [chartData, setChartData] = useState<SolChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    // Abort any ongoing request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    if (isManualRefresh || !data) {
      setLoading(true);
    }
    if (isManualRefresh || chartData.length === 0) {
      setChartLoading(true);
    }

    let headlineSuccess = false;
    let chartSuccess = false;
    let headlineErrStr: string | null = null;

    try {
      const [headlineRes, chartRes] = await Promise.allSettled([
        fetchLiveSolHeadlineData(controller.signal),
        fetchLiveSolChartData(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      if (headlineRes.status === "fulfilled") {
        setData(headlineRes.value);
        setIsStale(false);
        setError(null);
        headlineSuccess = true;
      } else {
        headlineErrStr =
          headlineRes.reason instanceof Error
            ? headlineRes.reason.message
            : "Failed to fetch headline market data.";
      }

      if (chartRes.status === "fulfilled") {
        setChartData(chartRes.value);
        chartSuccess = true;
      }

      // Handle failure & stale data retaining
      if (!headlineSuccess) {
        if (data) {
          // Retain last verified data but mark as stale
          setIsStale(true);
          setError(null); // Keep displaying stale data with stale banner
        } else {
          // No previous data exists
          setError(headlineErrStr || "Live market data unavailable.");
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const errMsg = err instanceof Error ? err.message : "Live market data unavailable.";
      if (data) {
        setIsStale(true);
      } else {
        setError(errMsg);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setChartLoading(false);
      }
    }
  }, [data, chartData.length]);

  // Polling setup
  useEffect(() => {
    let mounted = true;

    async function initialFetch() {
      if (!mounted) return;
      await loadData();
    }

    initialFetch();

    const headlineInterval = setInterval(async () => {
      if (!mounted) return;
      try {
        const headline = await fetchLiveSolHeadlineData();
        if (!mounted) return;
        setData(headline);
        setIsStale(false);
        setError(null);
      } catch {
        if (!mounted) return;
        setIsStale(true);
      }
    }, HEADLINE_POLL_MS);

    const chartInterval = setInterval(async () => {
      if (!mounted) return;
      try {
        const points = await fetchLiveSolChartData();
        if (!mounted) return;
        setChartData(points);
      } catch {
        // Retain current chart points if poll fails
      }
    }, CHART_POLL_MS);

    return () => {
      mounted = false;
      clearInterval(headlineInterval);
      clearInterval(chartInterval);
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  const manualRefresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  return {
    data,
    chartData,
    loading,
    chartLoading,
    error,
    lastUpdated: data?.lastUpdatedAt ?? null,
    isStale,
    refresh: manualRefresh,
  };
}
