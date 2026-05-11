import { NextResponse } from "next/server";

export const maxDuration = 30;

type JsonRecord = Record<string, unknown>;
type MarketQuote = {
  symbol: string;
  name: string;
  exchange: string | null;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  asOf: string | null;
  source: string;
};

const OPENAI_TIMEOUT_MS = 22000;
const QUOTE_TIMEOUT_MS = 4500;
const DIRECT_PEER_FALLBACKS: Record<string, string[]> = {
  AAPL: ["MSFT", "GOOGL", "SSNLF"],
  AMD: ["NVDA", "INTC", "AVGO"],
  AMZN: ["WMT", "MSFT", "GOOGL"],
  AVGO: ["NVDA", "AMD", "QCOM"],
  BAC: ["JPM", "WFC", "C"],
  CRM: ["NOW", "ORCL", "MSFT"],
  F: ["GM", "TSLA", "TM"],
  GOOGL: ["META", "MSFT", "AMZN"],
  INTC: ["AMD", "NVDA", "QCOM"],
  JPM: ["BAC", "WFC", "MS"],
  META: ["GOOGL", "SNAP", "PINS"],
  MSFT: ["GOOGL", "AMZN", "ORCL"],
  NFLX: ["DIS", "WBD", "PARA"],
  NVDA: ["AMD", "AVGO", "INTC"],
  ORCL: ["MSFT", "CRM", "SAP"],
  TSLA: ["GM", "F", "RIVN"],
  WMT: ["TGT", "COST", "AMZN"],
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(record: JsonRecord, key: string, fallback: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getNumberField(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeTickerSymbol(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .slice(0, 12);
}

function getRecordList(value: unknown, limit: number) {
  return Array.isArray(value) ? value.filter(isRecord).slice(0, limit) : [];
}

function getStringList(value: unknown, limit: number, fallback: string[]) {
  return Array.isArray(value)
    ? value.slice(0, limit).map((item) => String(item))
    : fallback;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");

    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }

    throw new Error("Could not extract valid JSON from model response.");
  }
}

async function fetchMarketQuote(ticker: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
  const normalizedTicker = normalizeTickerSymbol(ticker);
  const yahooSymbol = encodeURIComponent(normalizedTicker.replace(".", "-"));

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`,
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const chart = isRecord(data) ? data.chart : null;
    const results = isRecord(chart) && Array.isArray(chart.result) ? chart.result : [];
    const firstResult = results.find(isRecord);
    const meta = firstResult && isRecord(firstResult.meta) ? firstResult.meta : null;

    if (!meta) return null;

    const price = getNumberField(meta, "regularMarketPrice");
    if (price === null) return null;

    const previousClose =
      getNumberField(meta, "chartPreviousClose") ?? getNumberField(meta, "previousClose");
    const change = previousClose === null ? null : price - previousClose;
    const changePercent =
      previousClose === null || previousClose === 0 ? null : (change! / previousClose) * 100;
    const marketTime = getNumberField(meta, "regularMarketTime");
    const currency = getStringField(meta, "currency", "USD");
    const symbol = getStringField(meta, "symbol", normalizedTicker);
    const name =
      getStringField(meta, "longName", "") ||
      getStringField(meta, "shortName", "") ||
      symbol;

    return {
      symbol,
      name,
      exchange: getStringField(meta, "fullExchangeName", "") || getStringField(meta, "exchangeName", "") || null,
      price,
      currency,
      change,
      changePercent,
      dayHigh: getNumberField(meta, "regularMarketDayHigh"),
      dayLow: getNumberField(meta, "regularMarketDayLow"),
      volume: getNumberField(meta, "regularMarketVolume"),
      asOf: marketTime === null ? null : new Date(marketTime * 1000).toISOString(),
      source: "Yahoo Finance",
    } satisfies MarketQuote;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRecommendedSymbols(ticker: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
  const yahooSymbol = encodeURIComponent(normalizeTickerSymbol(ticker).replace(".", "-"));

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/${yahooSymbol}`,
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const finance = isRecord(data) ? data.finance : null;
    const results = isRecord(finance) && Array.isArray(finance.result) ? finance.result : [];
    const firstResult = results.find(isRecord);
    const symbols =
      firstResult && Array.isArray(firstResult.recommendedSymbols)
        ? firstResult.recommendedSymbols
        : [];

    return symbols
      .filter(isRecord)
      .map((item) => getStringField(item, "symbol", ""))
      .map(normalizeTickerSymbol)
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function getModelCompetitorSymbols(value: unknown) {
  return getRecordList(value, 4)
    .map((item) => getStringField(item, "symbol", ""))
    .map(normalizeTickerSymbol)
    .filter(Boolean);
}

function uniqueSymbols(symbols: string[], searchedTicker: string) {
  const seen = new Set<string>();
  const normalizedSearched = normalizeTickerSymbol(searchedTicker);

  return symbols
    .map(normalizeTickerSymbol)
    .filter((symbol) => symbol && symbol !== normalizedSearched)
    .filter((symbol) => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    });
}

function buildPeerMetrics(quote: MarketQuote, index: number, relevance: number) {
  const dayRange =
    quote.dayHigh !== null && quote.dayLow !== null && quote.dayHigh > quote.dayLow
      ? quote.dayHigh - quote.dayLow
      : null;
  const pricePosition =
    dayRange === null || quote.dayLow === null
      ? 50
      : clamp(((quote.price - quote.dayLow) / dayRange) * 100, 4, 100);
  const momentum = clamp(50 + (quote.changePercent ?? 0) * 7, 4, 100);

  return {
    peer: `Peer ${String.fromCharCode(65 + index)}`,
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    currency: quote.currency,
    change: quote.change,
    changePercent: quote.changePercent,
    asOf: quote.asOf,
    source: quote.source,
    pricePosition: Math.round(pricePosition),
    momentum: Math.round(momentum),
    relevance: Math.round(relevance),
  };
}

async function buildLiveCompetitors({
  searchedTicker,
  primaryQuote,
  modelCompetitors,
  recommendedSymbols,
}: {
  searchedTicker: string;
  primaryQuote: MarketQuote | null;
  modelCompetitors: string[];
  recommendedSymbols: string[];
}) {
  const fallbackSymbols = DIRECT_PEER_FALLBACKS[normalizeTickerSymbol(searchedTicker)] ?? [];
  const candidates = uniqueSymbols(
    [...modelCompetitors, ...fallbackSymbols, ...recommendedSymbols],
    searchedTicker
  );
  const competitorQuotes = await Promise.all(candidates.slice(0, 8).map(fetchMarketQuote));
  const liveCompetitors = competitorQuotes.filter((quote): quote is MarketQuote => quote !== null).slice(0, 2);
  const peers = [
    primaryQuote ? buildPeerMetrics(primaryQuote, 0, 100) : null,
    ...liveCompetitors.map((quote, index) => buildPeerMetrics(quote, index + 1, 86 - index * 8)),
  ].filter(Boolean);

  return peers;
}

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
    }

    const cleanedTicker = normalizeTickerSymbol(ticker);

    if (!cleanedTicker) {
      return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
    }

    const quotePromise = fetchMarketQuote(cleanedTicker);
    const recommendedSymbolsPromise = fetchRecommendedSymbols(cleanedTicker);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const prompt = `Analyze ticker ${cleanedTicker} as an institutional equity research analyst.

Return ONLY compact valid JSON. No markdown. Keep every string to one concise sentence.

Exact JSON shape:
{
  "company": "Company name",
  "sector": "Sector / industry",
  "competitors": [
    {
      "symbol": "Public direct competitor ticker",
      "name": "Competitor company name"
    },
    {
      "symbol": "Public direct competitor ticker",
      "name": "Competitor company name"
    }
  ],
  "about": "What the company does, how it makes money, and why institutions may care.",
  "thesis": "Institutional investment thesis.",
  "bull": "Bull case.",
  "bear": "Bear case.",
  "base": "Base case.",
  "leadership": "Leadership and CEO execution analysis.",
  "catalyst": "Key catalysts to monitor.",
  "invalidation": "What would weaken or invalidate the thesis.",
  "worldImpact": "Explain how understanding this company and its sector could benefit society, innovation, productivity, infrastructure, risk awareness, or smarter capital allocation.",
  "examples": [
    {
      "title": "Real-life example title",
      "scenario": "Concrete business or market scenario",
      "benefit": "How this could benefit customers, companies, investors, workers, innovation, or the economy",
      "signal": "What analysts should monitor"
    },
    {
      "title": "Real-life example title",
      "scenario": "Concrete business or market scenario",
      "benefit": "How this could benefit customers, companies, investors, workers, innovation, or the economy",
      "signal": "What analysts should monitor"
    },
    {
      "title": "Real-life example title",
      "scenario": "Concrete business or market scenario",
      "benefit": "How this could benefit customers, companies, investors, workers, innovation, or the economy",
      "signal": "What analysts should monitor"
    }
  ],
  "news": [
    {
      "headline": "Relevant market/catalyst watch item",
      "impact": "Why it matters",
      "signal": "What investors should monitor"
    },
    {
      "headline": "Relevant market/catalyst watch item",
      "impact": "Why it matters",
      "signal": "What investors should monitor"
    },
    {
      "headline": "Relevant market/catalyst watch item",
      "impact": "Why it matters",
      "signal": "What investors should monitor"
    }
  ],
  "monitor": [
    "Monitoring item 1",
    "Monitoring item 2",
    "Monitoring item 3",
    "Monitoring item 4",
    "Monitoring item 5"
  ]
}

Rules:
- Do not say buy, sell, or hold.
- Do not promise live price accuracy.
- Treat this as institutional research structure, not financial advice.
- Competitors must be publicly traded direct competitors or the closest listed sector peers. Exclude ${cleanedTicker}, ETFs, indexes, and private companies.
- Focus on business model, leadership, risks, catalysts, competitors, confirmation signals, and invalidation points.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.25,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a precise institutional equity research assistant. You always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "OpenAI request failed.",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    const parsedValue = extractJson(content);
    const parsed = isRecord(parsedValue) ? parsedValue : {};

    const [marketQuote, recommendedSymbols] = await Promise.all([
      quotePromise,
      recommendedSymbolsPromise,
    ]);
    const liveCompetitors = await buildLiveCompetitors({
      searchedTicker: cleanedTicker,
      primaryQuote: marketQuote,
      modelCompetitors: getModelCompetitorSymbols(parsed.competitors),
      recommendedSymbols,
    });

    return NextResponse.json({
      company: getStringField(parsed, "company", `${cleanedTicker} Intelligence Profile`),
      sector: getStringField(parsed, "sector", "Market Intelligence"),
      marketQuote,
      competitors: liveCompetitors,
      about: getStringField(parsed, "about", "Company overview unavailable."),
      thesis: getStringField(parsed, "thesis", "Thesis unavailable."),
      bull: getStringField(parsed, "bull", "Bull case unavailable."),
      bear: getStringField(parsed, "bear", "Bear case unavailable."),
      base: getStringField(parsed, "base", "Base case unavailable."),
      leadership: getStringField(parsed, "leadership", "Leadership analysis unavailable."),
      catalyst: getStringField(parsed, "catalyst", "Catalyst analysis unavailable."),
      invalidation: getStringField(parsed, "invalidation", "Invalidation analysis unavailable."),
      worldImpact: getStringField(
        parsed,
        "worldImpact",
        "Institutional intelligence can support smarter capital allocation, better risk awareness, and more disciplined long-term decision-making."
      ),
      examples: getRecordList(parsed.examples, 3).map((item) => ({
        title: getStringField(item, "title", "Real-life example"),
        scenario: getStringField(item, "scenario", "Scenario unavailable."),
        benefit: getStringField(item, "benefit", "Benefit unavailable."),
        signal: getStringField(item, "signal", "Signal unavailable."),
      })),
      news: getRecordList(parsed.news, 3).map((item) => ({
        headline: getStringField(item, "headline", "Market catalyst watch"),
        impact: getStringField(item, "impact", "Impact analysis unavailable."),
        signal: getStringField(item, "signal", "Monitor follow-up signals."),
      })),
      monitor: getStringList(parsed.monitor, 5, [
            "Earnings revision trend",
            "Relative strength vs. sector",
            "Margin direction",
            "Institutional ownership changes",
            "Leadership execution signals",
          ]),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected server error.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
