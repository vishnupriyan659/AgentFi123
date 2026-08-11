import { Router, Request, Response } from "express";

const router = Router();

interface QuoteCache {
  data: {
    priceUsd: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    provider: string;
    updatedAt: number;
  };
  fetchedAt: number;
}

interface HistoryCache {
  data: {
    range: string;
    prices: Array<{ timestamp: number; priceUsd: number }>;
    provider: string;
    updatedAt: number;
  };
  fetchedAt: number;
}

let quoteCache: QuoteCache | null = null;
const historyCache = new Map<string, HistoryCache>();

const QUOTE_CACHE_TTL_MS = 30000; // 30 seconds
const HISTORY_CACHE_TTL_MS = 300000; // 5 minutes

function getCoinGeckoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    headers["x-cg-demo-api-key"] = apiKey.trim();
  }
  return headers;
}

/**
 * GET /api/market/solana/quote
 */
router.get("/solana/quote", async (_req: Request, res: Response) => {
  const now = Date.now();
  if (quoteCache && now - quoteCache.fetchedAt < QUOTE_CACHE_TTL_MS) {
    res.json(quoteCache.data);
    return;
  }

  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: getCoinGeckoHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`CoinGecko HTTP ${response.status}`);
    }

    const json = await response.json();
    const solData = json?.solana;

    if (!solData || typeof solData !== "object") {
      throw new Error("Invalid CoinGecko payload");
    }

    const priceUsd = solData.usd;
    const change24h = solData.usd_24h_change;
    const volume24h = solData.usd_24h_vol;
    const marketCap = solData.usd_market_cap;

    if (
      typeof priceUsd !== "number" ||
      !Number.isFinite(priceUsd) ||
      typeof change24h !== "number" ||
      !Number.isFinite(change24h) ||
      typeof volume24h !== "number" ||
      !Number.isFinite(volume24h) ||
      typeof marketCap !== "number" ||
      !Number.isFinite(marketCap)
    ) {
      throw new Error("Invalid numeric fields in CoinGecko payload");
    }

    const payload = {
      priceUsd,
      change24h,
      volume24h,
      marketCap,
      provider: "CoinGecko",
      updatedAt: now,
    };

    quoteCache = { data: payload, fetchedAt: now };
    res.json(payload);
  } catch (error: any) {
    if (quoteCache) {
      // Serve stale cache if available upon upstream error
      res.json({
        ...quoteCache.data,
        isStale: true,
      });
      return;
    }
    res.status(503).json({
      error: "Live market data unavailable",
      message: error?.message || "Failed to reach CoinGecko API",
    });
  }
});

/**
 * GET /api/market/solana/history?range=24h (1h, 24h, 7d)
 */
router.get("/solana/history", async (req: Request, res: Response) => {
  const rangeParam = String(req.query.range || "24h").toLowerCase();
  const range = ["1h", "24h", "7d"].includes(rangeParam) ? rangeParam : "24h";
  const days = range === "7d" ? "7" : "1";

  const now = Date.now();
  const cached = historyCache.get(range);
  if (cached && now - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${days}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "GET",
      headers: getCoinGeckoHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`CoinGecko HTTP ${response.status}`);
    }

    const json = await response.json();
    const rawPrices = json?.prices;

    if (!Array.isArray(rawPrices) || rawPrices.length === 0) {
      throw new Error("Invalid price points array");
    }

    const prices = rawPrices
      .filter((pt) => Array.isArray(pt) && pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
      .map((pt) => ({
        timestamp: pt[0],
        priceUsd: pt[1],
      }));

    if (prices.length === 0) {
      throw new Error("No finite price points found");
    }

    // Filter down for 1h range if requested
    let filteredPrices = prices;
    if (range === "1h") {
      const oneHourAgo = now - 3600 * 1000;
      filteredPrices = prices.filter((p) => p.timestamp >= oneHourAgo);
      if (filteredPrices.length === 0) filteredPrices = prices.slice(-12);
    }

    const payload = {
      range,
      prices: filteredPrices,
      provider: "CoinGecko",
      updatedAt: now,
    };

    historyCache.set(range, { data: payload, fetchedAt: now });
    res.json(payload);
  } catch (error: any) {
    if (cached) {
      res.json({
        ...cached.data,
        isStale: true,
      });
      return;
    }
    res.status(503).json({
      error: "Live market data unavailable",
      message: error?.message || "Failed to reach CoinGecko API",
    });
  }
});

export default router;
