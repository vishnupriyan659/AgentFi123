export interface SolHeadlineMarketData {
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdatedAt: number; // Unix ms
  provider: string; // "CoinGecko"
}

export interface SolChartPoint {
  timestamp: number; // Unix ms
  price: number;
  timeLabel: string;
}

const DEFAULT_TIMEOUT_MS = 10000;

function getCoinGeckoBaseUrl(): string {
  return (
    import.meta.env.VITE_COINGECKO_API_BASE_URL ||
    "https://api.coingecko.com/api/v3"
  );
}

function getRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
  if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
    const trimmedKey = apiKey.trim();
    // CoinGecko demo API header
    headers["x-cg-demo-api-key"] = trimmedKey;
  }
  return headers;
}

/**
 * Fetches live SOL headline market metrics from CoinGecko.
 * Throws an error if API fails or returns invalid non-numeric data.
 */
export async function fetchLiveSolHeadlineData(
  signal?: AbortSignal
): Promise<SolHeadlineMarketData> {
  const baseUrl = getCoinGeckoBaseUrl();
  const url = `${baseUrl}/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  // Combine signals if external signal passed
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getRequestHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const solData = json?.solana;

    if (!solData || typeof solData !== "object") {
      throw new Error("Invalid CoinGecko response schema for Solana.");
    }

    const priceUsd = solData.usd;
    const priceChange24h = solData.usd_24h_change;
    const volume24h = solData.usd_24h_vol;
    const marketCap = solData.usd_market_cap;
    const rawLastUpdated = solData.last_updated_at;

    if (
      typeof priceUsd !== "number" ||
      !Number.isFinite(priceUsd) ||
      typeof priceChange24h !== "number" ||
      !Number.isFinite(priceChange24h) ||
      typeof volume24h !== "number" ||
      !Number.isFinite(volume24h) ||
      typeof marketCap !== "number" ||
      !Number.isFinite(marketCap)
    ) {
      throw new Error("Invalid numeric value received from CoinGecko simple/price endpoint.");
    }

    const lastUpdatedAt =
      typeof rawLastUpdated === "number" && Number.isFinite(rawLastUpdated)
        ? rawLastUpdated * 1000
        : Date.now();

    return {
      priceUsd,
      priceChange24h,
      volume24h,
      marketCap,
      lastUpdatedAt,
      provider: "CoinGecko",
    };
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  }
}

/**
 * Fetches 24-hour SOL/USD price history from CoinGecko market_chart.
 * Throws an error if API fails or returns invalid non-numeric data.
 */
export async function fetchLiveSolChartData(
  signal?: AbortSignal
): Promise<SolChartPoint[]> {
  const baseUrl = getCoinGeckoBaseUrl();
  const url = `${baseUrl}/coins/solana/market_chart?vs_currency=usd&days=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getRequestHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CoinGecko Chart API HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const pricesArr = json?.prices;

    if (!Array.isArray(pricesArr) || pricesArr.length === 0) {
      throw new Error("Empty or invalid price array received from CoinGecko market_chart.");
    }

    const chartPoints: SolChartPoint[] = [];

    for (const item of pricesArr) {
      if (!Array.isArray(item) || item.length < 2) continue;
      const timestamp = item[0];
      const price = item[1];

      if (
        typeof timestamp !== "number" ||
        !Number.isFinite(timestamp) ||
        typeof price !== "number" ||
        !Number.isFinite(price)
      ) {
        continue;
      }

      const dateObj = new Date(timestamp);
      const hours = String(dateObj.getHours()).padStart(2, "0");
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const timeLabel = `${hours}:${minutes}`;

      chartPoints.push({
        timestamp,
        price,
        timeLabel,
      });
    }

    if (chartPoints.length === 0) {
      throw new Error("No valid price points could be extracted from CoinGecko market_chart.");
    }

    return chartPoints;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  }
}
