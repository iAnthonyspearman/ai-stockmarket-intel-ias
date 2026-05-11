import { NextResponse } from "next/server";

export const maxDuration = 30;

type JsonRecord = Record<string, unknown>;
const OPENAI_TIMEOUT_MS = 22000;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(record: JsonRecord, key: string, fallback: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
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

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
    }

    const cleanedTicker = ticker.trim().toUpperCase();

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
        max_tokens: 1400,
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

    return NextResponse.json({
      company: getStringField(parsed, "company", `${cleanedTicker} Intelligence Profile`),
      sector: getStringField(parsed, "sector", "Market Intelligence"),
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
