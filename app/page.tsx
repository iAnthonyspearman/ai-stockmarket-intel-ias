"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Line, OrbitControls, Sparkles as DreiSparkles, Stars } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Command,
  Crown,
  Eye,
  FileSearch,
  Gauge,
  GitCompare,
  Landmark,
  LockKeyhole,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line as LineChartCanvas } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement
);

type IntelligenceResult = {
  ticker: string;
  company: string;
  sector: string;
  marketQuote: MarketQuote | null;
  about: string;
  thesis: string;
  bull: string;
  bear: string;
  base: string;
  leadership: string;
  catalyst: string;
  invalidation: string;
  worldImpact: string;
  riskScore: number;
  qualityScore: number;
  valuationScore: number;
  momentumScore: number;
  confidence: number;
  competitors: LiveCompetitor[];
  risk: { label: string; value: number }[];
  news: { headline: string; impact: string; signal: string }[];
  examples: { title: string; scenario: string; benefit: string; signal: string }[];
  monitor: string[];
};

type MarketQuote = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  source: string;
  asOf: string | null;
};

type LiveCompetitor = {
  peer: string;
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  source: string;
  asOf: string | null;
  pricePosition: number;
  momentum: number;
  relevance: number;
};

type IntelligenceApiPayload = Partial<
  Pick<
    IntelligenceResult,
    | "company"
    | "sector"
    | "marketQuote"
    | "competitors"
    | "about"
    | "thesis"
    | "bull"
    | "bear"
    | "base"
    | "leadership"
    | "catalyst"
    | "invalidation"
    | "worldImpact"
    | "news"
    | "examples"
    | "monitor"
  >
> & {
  error?: string;
};

type ThesisCard = {
  title: string;
  body: string;
  Icon: LucideIcon;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNewsList(value: unknown): value is IntelligenceResult["news"] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.headline === "string" &&
        typeof item.impact === "string" &&
        typeof item.signal === "string"
    )
  );
}

function isExampleList(value: unknown): value is IntelligenceResult["examples"] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.title === "string" &&
        typeof item.scenario === "string" &&
        typeof item.benefit === "string" &&
        typeof item.signal === "string"
    )
  );
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMarketQuote(value: unknown): value is MarketQuote {
  return (
    isRecord(value) &&
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.currency === "string" &&
    (typeof value.change === "number" || value.change === null) &&
    (typeof value.changePercent === "number" || value.changePercent === null) &&
    (typeof value.dayHigh === "number" || value.dayHigh === null) &&
    (typeof value.dayLow === "number" || value.dayLow === null) &&
    (typeof value.volume === "number" || value.volume === null) &&
    typeof value.source === "string" &&
    (typeof value.asOf === "string" || value.asOf === null)
  );
}

function isLiveCompetitor(value: unknown): value is LiveCompetitor {
  return (
    isRecord(value) &&
    typeof value.peer === "string" &&
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    (typeof value.price === "number" || value.price === null) &&
    typeof value.currency === "string" &&
    (typeof value.change === "number" || value.change === null) &&
    (typeof value.changePercent === "number" || value.changePercent === null) &&
    (typeof value.dayHigh === "number" || value.dayHigh === null) &&
    (typeof value.dayLow === "number" || value.dayLow === null) &&
    (typeof value.volume === "number" || value.volume === null) &&
    typeof value.source === "string" &&
    (typeof value.asOf === "string" || value.asOf === null) &&
    typeof value.pricePosition === "number" &&
    typeof value.momentum === "number" &&
    typeof value.relevance === "number"
  );
}

function isLiveCompetitorList(value: unknown): value is LiveCompetitor[] {
  return Array.isArray(value) && value.every(isLiveCompetitor);
}

function readStringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function parseIntelligencePayload(value: unknown): IntelligenceApiPayload {
  if (!isRecord(value)) return {};

  return {
    company: readStringField(value, "company"),
    sector: readStringField(value, "sector"),
    marketQuote: isMarketQuote(value.marketQuote) ? value.marketQuote : undefined,
    competitors: isLiveCompetitorList(value.competitors) ? value.competitors : undefined,
    about: readStringField(value, "about"),
    thesis: readStringField(value, "thesis"),
    bull: readStringField(value, "bull"),
    bear: readStringField(value, "bear"),
    base: readStringField(value, "base"),
    leadership: readStringField(value, "leadership"),
    catalyst: readStringField(value, "catalyst"),
    invalidation: readStringField(value, "invalidation"),
    worldImpact: readStringField(value, "worldImpact"),
    error: readStringField(value, "error"),
    news: isNewsList(value.news) ? value.news : undefined,
    examples: isExampleList(value.examples) ? value.examples : undefined,
    monitor: isStringList(value.monitor) ? value.monitor : undefined,
  };
}

const defaultResult: IntelligenceResult = {
  ticker: "NVDA",
  company: "NVIDIA Corporation",
  sector: "Semiconductors / AI Infrastructure",
  marketQuote: null,
  about:
    "NVIDIA designs GPUs, AI accelerators, networking systems, and software platforms used in gaming, data centers, AI model training, inference, visualization, and accelerated computing.",
  thesis:
    "NVIDIA is positioned as a core infrastructure provider for AI compute demand, with data center acceleration, CUDA ecosystem strength, and enterprise AI adoption driving the institutional thesis.",
  bull:
    "Sustained AI infrastructure spending, pricing power, and data center growth could support continued earnings expansion.",
  bear:
    "Valuation risk, customer concentration, margin normalization, and custom silicon competition could weaken the thesis.",
  base:
    "Base case assumes AI demand remains strong but valuation becomes more sensitive to growth durability and margin quality.",
  leadership:
    "Leadership is founder-led, execution-focused, and deeply aligned with accelerated computing strategy.",
  catalyst:
    "Catalysts include earnings revisions, data center growth, new AI product cycles, cloud capex trends, and software expansion.",
  invalidation:
    "The thesis weakens if data center growth decelerates sharply, margins compress, or major customers shift toward internal silicon.",
  worldImpact:
    "Institutional intelligence helps decision-makers allocate capital more wisely, understand risk earlier, and support companies building infrastructure, productivity, healthcare, energy, security, and innovation for the real economy.",
  riskScore: 62,
  qualityScore: 91,
  valuationScore: 56,
  momentumScore: 88,
  confidence: 84,
  risk: [
    { label: "Valuation", value: 78 },
    { label: "Competition", value: 61 },
    { label: "Macro", value: 48 },
    { label: "Leadership", value: 29 },
  ],
  competitors: [
    {
      peer: "Peer A",
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      price: null,
      currency: "USD",
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      source: "Live quote pending",
      asOf: null,
      pricePosition: 72,
      momentum: 66,
      relevance: 100,
    },
    {
      peer: "Peer B",
      symbol: "AMD",
      name: "Advanced Micro Devices, Inc.",
      price: null,
      currency: "USD",
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      source: "Live quote pending",
      asOf: null,
      pricePosition: 56,
      momentum: 52,
      relevance: 86,
    },
    {
      peer: "Peer C",
      symbol: "AVGO",
      name: "Broadcom Inc.",
      price: null,
      currency: "USD",
      change: null,
      changePercent: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      source: "Live quote pending",
      asOf: null,
      pricePosition: 61,
      momentum: 58,
      relevance: 78,
    },
  ],
  news: [
    {
      headline: "AI infrastructure demand remains the central catalyst watch",
      impact: "Sustained cloud and enterprise AI spending supports the long-term thesis.",
      signal: "Monitor data center growth, gross margin, and cloud capex commentary.",
    },
    {
      headline: "Competition from custom silicon remains a key thesis pressure",
      impact: "Major customers developing internal chips could affect long-term pricing power.",
      signal: "Monitor hyperscaler capex mix and internal accelerator announcements.",
    },
    {
      headline: "Valuation sensitivity increases around earnings expectations",
      impact: "High expectations can create downside risk if growth or margins slow.",
      signal: "Monitor earnings revisions and forward multiple compression.",
    },
  ],
  examples: [
    {
      title: "AI Infrastructure Buildout",
      scenario: "A cloud provider increases data center investment to support enterprise AI workloads.",
      benefit: "Better compute infrastructure can accelerate research, automation, medical discovery, and productivity tools.",
      signal: "Monitor data center revenue, cloud capex, GPU demand, and margin strength.",
    },
    {
      title: "Enterprise Productivity",
      scenario: "Businesses adopt AI systems that reduce manual work and improve decision speed.",
      benefit: "Companies can operate more efficiently, reduce waste, and redeploy human talent toward higher-value work.",
      signal: "Monitor software adoption, enterprise demand, and management commentary.",
    },
    {
      title: "Risk-Aware Capital Allocation",
      scenario: "Investors compare bull, bear, and base cases before committing capital.",
      benefit: "Better research can reduce emotional investing and improve disciplined long-term decision-making.",
      signal: "Monitor valuation, earnings revisions, leadership execution, and thesis invalidation points.",
    },
  ],
  monitor: [
    "Data center revenue growth",
    "Gross margin durability",
    "Cloud capex commentary",
    "Competitive custom silicon adoption",
    "Earnings revision trend",
  ],
};

const demoTickers: Record<string, Partial<IntelligenceResult>> = {
  NVDA: defaultResult,
  AAPL: {
    company: "Apple Inc.",
    sector: "Consumer Technology / Platforms",
    about:
      "Apple designs consumer hardware, software, services, and ecosystem platforms that monetize through devices, subscriptions, app economics, and high-retention customer relationships.",
    thesis:
      "Apple remains a premium hardware, services, and ecosystem company with strong cash flow, brand loyalty, and optionality around AI-enabled devices.",
    bull:
      "Bull case depends on services growth, upgrade cycles, capital returns, ecosystem retention, and new AI-integrated user experiences.",
    bear:
      "Bear case centers on slower hardware growth, regulatory pressure, China exposure, and valuation compression.",
    leadership:
      "Leadership is operationally disciplined with strong capital allocation, supply chain execution, and ecosystem stewardship.",
  },
  TSLA: {
    company: "Tesla Inc.",
    sector: "EV / Energy / Autonomy",
    about:
      "Tesla operates across electric vehicles, energy storage, charging infrastructure, software, autonomy research, and longer-term robotics optionality.",
    thesis:
      "Tesla’s institutional case depends on whether the market values it as an auto manufacturer, autonomy platform, energy company, or robotics optionality vehicle.",
    bull:
      "Bull case depends on autonomy progress, margin recovery, energy growth, software upside, and manufacturing scale.",
    bear:
      "Bear case centers on EV competition, margin pressure, execution risk, leadership volatility, and valuation sensitivity.",
    leadership:
      "Leadership is highly visionary but carries key-person risk, execution volatility, and market narrative sensitivity.",
  },
};

function buildResult(tickerInput: string): IntelligenceResult {
  const ticker = tickerInput.trim().toUpperCase() || "NVDA";
  const preset = demoTickers[ticker] ?? {};
  const seed = ticker.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const riskScore = 42 + (seed % 38);
  const qualityScore = 58 + (seed % 35);
  const valuationScore = 38 + (seed % 44);
  const momentumScore = 45 + (seed % 48);
  const confidence = Math.round((qualityScore + momentumScore + (100 - riskScore)) / 3);

  return {
    ...defaultResult,
    ticker,
    company: preset.company ?? `${ticker} Holdings Intelligence Profile`,
    sector: preset.sector ?? "Market Intelligence / Sector Analysis",
    about:
      preset.about ??
      `${ticker} should be reviewed through its business model, revenue quality, margin profile, leadership execution, sector position, and market signal strength.`,
    thesis:
      preset.thesis ??
      `${ticker} requires a layered institutional review across business model quality, competitive positioning, valuation sensitivity, leadership execution, market sentiment, and confirmation signals.`,
    bull:
      preset.bull ??
      "Bull case depends on improving revenue quality, durable margins, strong sector positioning, institutional accumulation, and positive earnings revisions.",
    bear:
      preset.bear ??
      "Bear case centers on valuation compression, weaker growth durability, competitive pressure, macro sensitivity, and thesis invalidation risk.",
    base:
      "Base case assumes mixed market conditions where execution quality, valuation discipline, and sector momentum determine risk-adjusted opportunity.",
    leadership:
      preset.leadership ??
      "Leadership analysis should focus on capital allocation, execution record, communication quality, crisis response, and strategic consistency.",
    catalyst:
      "Catalysts include earnings, guidance revisions, analyst updates, product cycles, sector rotation, macro shifts, and institutional positioning.",
    invalidation:
      "The thesis weakens if revenue quality deteriorates, margins compress, leadership execution breaks down, or the stock fails to confirm relative strength.",
    riskScore,
    qualityScore,
    valuationScore,
    momentumScore,
    confidence,
    worldImpact:
      `${ticker} can be evaluated by how its products, services, leadership, and capital allocation may affect productivity, innovation, infrastructure, employment, customer outcomes, and long-term economic value.`,
    examples: [
      {
        title: `${ticker} business model in the real world`,
        scenario: "A company improves products, infrastructure, services, or operating efficiency in its sector.",
        benefit: "Investors can understand whether the business creates durable value beyond short-term price movement.",
        signal: "Monitor revenue quality, customer demand, margins, and competitive strength.",
      },
      {
        title: `${ticker} leadership execution example`,
        scenario: "Management makes strategic decisions around investment, acquisitions, innovation, or capital returns.",
        benefit: "Strong leadership can improve confidence, execution quality, and long-term shareholder alignment.",
        signal: "Monitor guidance accuracy, capital allocation, and crisis response.",
      },
      {
        title: `${ticker} risk management example`,
        scenario: "Analysts identify valuation, competition, macro, or regulatory pressure before it becomes obvious.",
        benefit: "Risk-aware research helps investors avoid blind spots and build more disciplined thesis monitoring.",
        signal: "Monitor thesis invalidation points, peer performance, and earnings revisions.",
      },
    ],
    competitors: [
      {
        peer: "Peer A",
        symbol: ticker,
        name: preset.company ?? `${ticker} searched ticker`,
        price: null,
        currency: "USD",
        change: null,
        changePercent: null,
        dayHigh: null,
        dayLow: null,
        volume: null,
        source: "Live quote pending",
        asOf: null,
        pricePosition: 50 + (seed % 40),
        momentum: 46 + (seed % 35),
        relevance: 100,
      },
      {
        peer: "Peer B",
        symbol: "LIVE",
        name: "Live competitor appears after analysis",
        price: null,
        currency: "USD",
        change: null,
        changePercent: null,
        dayHigh: null,
        dayLow: null,
        volume: null,
        source: "Live quote pending",
        asOf: null,
        pricePosition: 42 + ((seed + 13) % 42),
        momentum: 50 + ((seed + 9) % 35),
        relevance: 86,
      },
      {
        peer: "Peer C",
        symbol: "LIVE",
        name: "Live competitor appears after analysis",
        price: null,
        currency: "USD",
        change: null,
        changePercent: null,
        dayHigh: null,
        dayLow: null,
        volume: null,
        source: "Live quote pending",
        asOf: null,
        pricePosition: 35 + ((seed + 21) % 45),
        momentum: 38 + ((seed + 19) % 42),
        relevance: 78,
      },
    ],
    risk: [
      { label: "Valuation", value: riskScore },
      { label: "Competition", value: 44 + ((seed + 7) % 40) },
      { label: "Macro", value: 35 + ((seed + 11) % 44) },
      { label: "Leadership", value: 22 + ((seed + 17) % 39) },
    ],
    news: [
      {
        headline: `${ticker} catalyst watch`,
        impact: "The next move depends on earnings quality, sector strength, and institutional confidence.",
        signal: "Monitor earnings revisions, guidance, and relative strength.",
      },
      {
        headline: `${ticker} risk watch`,
        impact: "The thesis can weaken if valuation, margins, or competitive positioning deteriorate.",
        signal: "Monitor margin pressure, peer performance, and valuation compression.",
      },
      {
        headline: `${ticker} leadership watch`,
        impact: "Execution quality and capital allocation can materially influence investor confidence.",
        signal: "Monitor strategy updates, guidance credibility, and management communication.",
      },
    ],
    monitor: [
      "Earnings revision trend",
      "Relative strength vs. sector",
      "Margin direction",
      "Institutional ownership changes",
      "Leadership execution signals",
    ],
  };
}

function formatCurrencyValue(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: price >= 100 ? 2 : 4,
  }).format(price);
}

function formatMarketPrice(quote: MarketQuote) {
  return formatCurrencyValue(quote.price, quote.currency);
}

function formatQuoteMove(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function formatQuotePercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatVolume(value: number | null) {
  if (value === null) return "Volume unavailable";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B volume`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M volume`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K volume`;
  return `${value.toLocaleString("en-US")} volume`;
}

function formatDayRange(peer: LiveCompetitor) {
  if (peer.dayLow === null || peer.dayHigh === null) return "Range unavailable";
  return `${formatCurrencyValue(peer.dayLow, peer.currency)} - ${formatCurrencyValue(peer.dayHigh, peer.currency)}`;
}

function formatQuoteTime(value: string | null) {
  if (!value) return "Latest available quote snapshot";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest available quote snapshot";

  return `As of ${date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function HelixRail({
  points,
  color,
  active,
  radius = 0.022,
}: {
  points: THREE.Vector3[];
  color: string;
  active: boolean;
  radius?: number;
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  return (
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, 180, radius, 18, false]} />
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 0.65 : 0.36}
        metalness={0.88}
        roughness={0.13}
        clearcoat={1}
        clearcoatRoughness={0.08}
        reflectivity={0.95}
      />
    </mesh>
  );
}

function DnaNode({
  position,
  color,
  active,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  active: boolean;
  scale?: number;
}) {
  const node = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!node.current) return;
    node.current.rotation.y += delta * (active ? 0.7 : 0.25);
    node.current.rotation.x += delta * (active ? 0.28 : 0.1);
  });

  return (
    <group ref={node} position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.078, 48, 48]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.7 : 0.34}
          metalness={0.92}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.06}
          reflectivity={1}
        />
      </mesh>

      <mesh scale={1.72}>
        <sphereGeometry args={[0.078, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.13 : 0.07} />
      </mesh>

      <mesh position={[-0.028, 0.038, 0.056]} scale={0.32}>
        <sphereGeometry args={[0.045, 24, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} transparent opacity={0.86} />
      </mesh>

      <mesh rotation={[1.2, 0.3, 0.6]}>
        <torusGeometry args={[0.135, 0.0055, 12, 64]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.75} transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

function DnaRung({
  start,
  end,
  active,
  color,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  active: boolean;
  color: string;
}) {
  const curve = useMemo(() => {
    const mid = start.clone().lerp(end, 0.5);
    mid.z += 0.04;
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [start, end]);

  return (
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, 24, active ? 0.011 : 0.006, 10, false]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 0.72 : 0.18}
        metalness={0.52}
        roughness={0.18}
        transparent
        opacity={active ? 0.82 : 0.28}
      />
    </mesh>
  );
}

function DnaHelix({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const count = 48;

  const left = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const angle = t * Math.PI * 9.2;
      const taper = 0.82 + Math.sin(t * Math.PI) * 0.08;
      return new THREE.Vector3(Math.cos(angle) * taper, (t - 0.5) * 3.75, Math.sin(angle) * taper);
    });
  }, []);

  const right = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const angle = t * Math.PI * 9.2 + Math.PI;
      const taper = 0.82 + Math.sin(t * Math.PI) * 0.08;
      return new THREE.Vector3(Math.cos(angle) * taper, (t - 0.5) * 3.75, Math.sin(angle) * taper);
    });
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (active ? 0.26 : 0.12);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, active ? 0.2 : 0.1, delta * 0.65);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, active ? -0.08 : -0.035, delta * 0.65);
  });

  return (
    <group ref={group}>
      <HelixRail points={left} color="#d4af37" active={active} radius={0.026} />
      <HelixRail points={right} color="#22c55e" active={active} radius={0.026} />

      <Line points={left} color="#fff3b0" lineWidth={1.1} transparent opacity={0.42} />
      <Line points={right} color="#bbf7d0" lineWidth={1.1} transparent opacity={0.36} />

      {left.map((point, index) => {
        const rightPoint = right[index];
        const activeNode = index % 3 === 0;
        const majorNode = index % 6 === 0;

        return (
          <group key={index}>
            <DnaRung
              start={point}
              end={rightPoint}
              active={activeNode}
              color={activeNode ? "#f8e7a1" : "#64748b"}
            />

            {activeNode && (
              <>
                <DnaNode
                  position={point.toArray() as [number, number, number]}
                  color={majorNode ? "#f8e7a1" : "#d4af37"}
                  active={active}
                  scale={majorNode ? 1.28 : 0.88}
                />
                <DnaNode
                  position={rightPoint.toArray() as [number, number, number]}
                  color={majorNode ? "#bbf7d0" : "#22c55e"}
                  active={active}
                  scale={majorNode ? 1.2 : 0.86}
                />
              </>
            )}
          </group>
        );
      })}

      <mesh position={[0, -2.22, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 128]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

function DnaScene({ active, mobile }: { active: boolean; mobile: boolean }) {
  return (
    <Canvas
      shadows={mobile ? false : { type: THREE.PCFShadowMap }}
      dpr={mobile ? 1 : [1, 2]}
      gl={{
        antialias: !mobile,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: mobile ? "default" : "high-performance",
      }}
      camera={{ position: [0, mobile ? 0.18 : 0.12, mobile ? 5.7 : 5.35], fov: mobile ? 42 : 38 }}
    >
      <color attach="background" args={["#050707"]} />
      <fog attach="fog" args={["#050707", 4.8, 9.6]} />

      <ambientLight intensity={0.22} />
      <directionalLight position={[-4.2, 4.8, 5]} intensity={2.65} color="#ffffff" castShadow={!mobile} />
      <spotLight
        position={[3.4, 3.9, 3.8]}
        angle={0.42}
        penumbra={0.72}
        intensity={5.25}
        color="#d4af37"
        castShadow={!mobile}
      />
      <pointLight position={[-2.8, -1.9, 2.8]} intensity={1.95} color="#22c55e" />
      <pointLight position={[2.4, -2.25, 1.9]} intensity={1.35} color="#f8e7a1" />
      <pointLight position={[0, 2.4, -2.2]} intensity={0.95} color="#ffffff" />

      {!mobile && <Environment preset="city" />}
      <Stars radius={58} depth={24} count={mobile ? 260 : 900} factor={mobile ? 2.4 : 3.4} saturation={0} fade speed={0.18} />
      <DreiSparkles count={mobile ? 24 : 76} scale={[3.4, 4.6, 2]} size={mobile ? 1.6 : 2.3} speed={0.14} color="#f8e7a1" />

      <Float speed={mobile ? 0.55 : 1.1} rotationIntensity={mobile ? 0.08 : 0.18} floatIntensity={mobile ? 0.22 : 0.55}>
        <DnaHelix active={active} />
      </Float>

      {!mobile && (
        <>
          <ContactShadows
            position={[0, -2.18, 0]}
            opacity={0.48}
            scale={5.1}
            blur={3.1}
            far={4.8}
            color="#000000"
          />

          <EffectComposer>
            <Bloom intensity={0.72} luminanceThreshold={0.2} luminanceSmoothing={0.38} />
            <DepthOfField focusDistance={0.015} focalLength={0.032} bokehScale={1.15} />
            <Noise opacity={0.025} />
            <Vignette eskil={false} offset={0.2} darkness={0.72} />
          </EffectComposer>
        </>
      )}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={mobile ? 0.12 : active ? 0.42 : 0.22}
      />
    </Canvas>
  );
}

function lineData(result: IntelligenceResult) {
  return {
    labels: ["Quality", "Valuation", "Momentum", "Risk", "Confidence"],
    datasets: [
      {
        label: "Institutional Signal",
        data: [result.qualityScore, result.valuationScore, result.momentumScore, 100 - result.riskScore, result.confidence],
        tension: 0.42,
        borderWidth: 3,
        pointRadius: 4,
        borderColor: "rgba(212,175,55,.95)",
        backgroundColor: "rgba(212,175,55,.18)",
      },
    ],
  };
}

function riskData(result: IntelligenceResult) {
  return {
    labels: result.risk.map((item) => item.label),
    datasets: [
      {
        label: "Risk Exposure",
        data: result.risk.map((item) => item.value),
        borderRadius: 12,
        backgroundColor: [
          "rgba(244,63,94,.72)",
          "rgba(212,175,55,.78)",
          "rgba(59,130,246,.62)",
          "rgba(34,197,94,.64)",
        ],
      },
    ],
  };
}

function competitorData(result: IntelligenceResult) {
  return {
    labels: result.competitors.map((item) => item.symbol),
    datasets: [
      {
        label: "Current Price",
        data: result.competitors.map((item) => item.price ?? 0),
        backgroundColor: "rgba(34,197,94,.72)",
        borderRadius: 10,
        yAxisID: "price",
      },
      {
        label: "Day Change %",
        data: result.competitors.map((item) => item.changePercent ?? 0),
        backgroundColor: "rgba(212,175,55,.78)",
        borderRadius: 10,
        yAxisID: "percent",
      },
      {
        label: "Volume (M)",
        data: result.competitors.map((item) => (item.volume ?? 0) / 1_000_000),
        backgroundColor: "rgba(148,163,184,.65)",
        borderRadius: 10,
        yAxisID: "volume",
      },
    ],
  };
}

function confidenceData(result: IntelligenceResult) {
  return {
    labels: ["Confidence", "Open Questions"],
    datasets: [
      {
        data: [result.confidence, 100 - result.confidence],
        borderWidth: 0,
        backgroundColor: ["rgba(212,175,55,.92)", "rgba(148,163,184,.20)"],
      },
    ],
  };
}

function useMobileHelixMode() {
  const [isMobileHelix, setIsMobileHelix] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const updateMode = () => setIsMobileHelix(query.matches);

    updateMode();
    query.addEventListener("change", updateMode);

    return () => query.removeEventListener("change", updateMode);
  }, []);

  return isMobileHelix;
}

const lineChartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "rgba(255,255,255,.72)" } },
    tooltip: {
      backgroundColor: "rgba(5,7,7,.95)",
      borderColor: "rgba(212,175,55,.45)",
      borderWidth: 1,
      titleColor: "#f8e7a1",
      bodyColor: "rgba(255,255,255,.85)",
      padding: 12,
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,.55)" },
      grid: { color: "rgba(255,255,255,.08)" },
    },
    y: {
      min: 0,
      max: 100,
      ticks: { color: "rgba(255,255,255,.55)" },
      grid: { color: "rgba(255,255,255,.08)" },
    },
  },
};

const barChartOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "rgba(255,255,255,.72)" } },
    tooltip: {
      backgroundColor: "rgba(5,7,7,.95)",
      borderColor: "rgba(212,175,55,.45)",
      borderWidth: 1,
      titleColor: "#f8e7a1",
      bodyColor: "rgba(255,255,255,.85)",
      padding: 12,
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,.55)" },
      grid: { color: "rgba(255,255,255,.08)" },
    },
    y: {
      min: 0,
      max: 100,
      ticks: { color: "rgba(255,255,255,.55)" },
      grid: { color: "rgba(255,255,255,.08)" },
    },
  },
};

const competitorChartOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "rgba(255,255,255,.72)" } },
    tooltip: {
      backgroundColor: "rgba(5,7,7,.95)",
      borderColor: "rgba(212,175,55,.45)",
      borderWidth: 1,
      titleColor: "#f8e7a1",
      bodyColor: "rgba(255,255,255,.85)",
      padding: 12,
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,.65)" },
      grid: { color: "rgba(255,255,255,.06)" },
    },
    price: {
      position: "left",
      ticks: { color: "rgba(34,197,94,.78)" },
      grid: { color: "rgba(255,255,255,.08)" },
    },
    percent: {
      position: "right",
      ticks: { color: "rgba(212,175,55,.8)" },
      grid: { drawOnChartArea: false },
    },
    volume: {
      position: "right",
      ticks: { color: "rgba(148,163,184,.75)" },
      grid: { drawOnChartArea: false },
    },
  },
};

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  plugins: {
    legend: { position: "bottom", labels: { color: "rgba(255,255,255,.72)" } },
  },
};

export default function Home() {
  const [draftTicker, setDraftTicker] = useState("NVDA");
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const mobileHelix = useMobileHelixMode();
  const helixModeReady = mobileHelix !== null;

  const preview = useMemo(() => buildResult(draftTicker), [draftTicker]);
  const generated = result ?? defaultResult;
  const thesisCases: ThesisCard[] = [
    { title: "Bull Case", body: generated.bull, Icon: TrendingUp },
    { title: "Bear Case", body: generated.bear, Icon: AlertTriangle },
    { title: "Base Case", body: generated.base, Icon: Target },
  ];
  const intelligenceChecks: ThesisCard[] = [
    { title: "Catalyst", body: generated.catalyst, Icon: Sparkles },
    { title: "Invalidation", body: generated.invalidation, Icon: LockKeyhole },
  ];

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisStatus(null);
    const cleanedTicker = draftTicker.trim().toUpperCase() || "NVDA";
    const fallback = buildResult(cleanedTicker);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: cleanedTicker }),
      });

      const data = parseIntelligencePayload(await response.json());

      if (!response.ok) throw new Error(data?.error || "Analysis request failed.");

      setResult({
        ...fallback,
        ...data,
        ticker: cleanedTicker,
        riskScore: fallback.riskScore,
        qualityScore: fallback.qualityScore,
        valuationScore: fallback.valuationScore,
        momentumScore: fallback.momentumScore,
        confidence: fallback.confidence,
        marketQuote: data.marketQuote ?? fallback.marketQuote,
        competitors: data.competitors ?? fallback.competitors,
        risk: fallback.risk,
        news: data.news ?? fallback.news,
        worldImpact: data.worldImpact ?? fallback.worldImpact,
        examples: data.examples ?? fallback.examples,
        monitor: data.monitor ?? fallback.monitor,
      });
      setAnalysisStatus(`Institutional intelligence generated for ${cleanedTicker}.`);
    } catch (error) {
      console.error(error);
      setResult({
        ...fallback,
        thesis:
          fallback.thesis +
          " The local fallback model was used because the live AI route did not return successfully.",
      });
      setAnalysisStatus("Live AI research was unavailable, so the terminal used its local fallback model.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDemoSelect = (symbol: string) => {
    setDraftTicker(symbol);
    setResult(null);
    setAnalysisStatus(null);
  };

  return (
    <main className={`min-h-screen overflow-hidden bg-[#050707] text-white ${isAnalyzing ? "calculating" : ""}`}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(212,175,55,.16),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(34,197,94,.13),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,.06),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-7 px-5 py-6 lg:px-8">
        <nav className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-3xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/35">
              <Command className="h-5 w-5 text-gold-light" />
            </div>
            <div>
              <p className="text-sm text-white/50">Institutional Research Terminal</p>
              <h1 className="text-lg font-semibold tracking-tight">AI Institutional Market Intelligence Terminal</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {["NVDA", "AAPL", "TSLA"].map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => handleDemoSelect(symbol)}
                className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-2 text-sm text-gold-light transition hover:bg-gold/20"
              >
                {symbol}
              </button>
            ))}
          </div>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <motion.section initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[2rem] p-6 md:p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm text-gold-light">
              <Sparkles className="h-4 w-4" />
              Institutional market intelligence
            </div>

            <h2 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Analyze companies like an institutional research terminal.
            </h2>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/62">
              Enter a ticker and generate layered intelligence across business model, competitors,
              leadership, valuation, risk, catalysts, thesis structure, and monitoring signals.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-4">
              {[
                [`${generated.qualityScore}%`, "Business Quality"],
                [`${generated.momentumScore}%`, "Market Momentum"],
                [`${generated.riskScore}%`, "Risk Pressure"],
                [`${generated.confidence}%`, "AI Confidence"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <p className="text-2xl font-semibold text-gold-light">{value}</p>
                  <p className="mt-1 text-sm text-white/45">{label}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="glass-panel overflow-hidden rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">3D Thesis DNA</p>
                <h3 className="text-2xl font-semibold">Market Intelligence Helix</h3>
              </div>
              <BrainCircuit className="h-6 w-6 text-emerald-200" />
            </div>

            <div className="dna-viewport h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-black/35">
              {helixModeReady && (
                <DnaScene active={isAnalyzing || Boolean(result)} mobile={mobileHelix} />
              )}
            </div>
          </motion.section>
        </div>

        <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Search className="h-6 w-6 text-gold-light" />
              <div>
                <p className="text-sm text-white/50">Ticker Intelligence Engine</p>
                <h3 className="text-2xl font-semibold">Enter any ticker</h3>
              </div>
            </div>

            <input
              aria-label="Ticker symbol"
              value={draftTicker}
              onChange={(event) => {
                setDraftTicker(event.target.value.toUpperCase());
                setResult(null);
                setAnalysisStatus(null);
              }}
              placeholder="NVDA, AAPL, TSLA..."
              className="w-full rounded-3xl border border-white/10 bg-black/35 px-5 py-5 text-2xl font-semibold uppercase tracking-[0.12em] text-white outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/10 sm:text-3xl"
            />

            <button
              type="button"
              onClick={runAnalysis}
              disabled={isAnalyzing}
              aria-busy={isAnalyzing}
              className="group relative mt-5 flex w-full items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-gradient-to-r from-gold via-[#f8e7a1] to-emerald-300 px-6 py-4 font-semibold text-black shadow-[0_0_45px_rgba(212,175,55,.24)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
            >
              <span className="absolute inset-0 translate-x-[-130%] bg-gradient-to-r from-transparent via-white/55 to-transparent transition duration-700 group-hover:translate-x-[130%]" />
              <span className="relative flex items-center gap-3">
                {isAnalyzing ? "Generating live AI research..." : "Analyze Ticker"}
                <ArrowRight className="h-5 w-5" />
              </span>
            </button>

            <div className="mt-5 rounded-3xl border border-gold/20 bg-gold/10 p-4">
              <p className="text-sm font-semibold text-gold-light">Draft preview</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {preview.company} — {preview.sector}
              </p>
            </div>

            <div className="mt-4 min-h-6" role="status" aria-live="polite">
              {isAnalyzing ? (
                <p className="text-sm text-gold-light">Building institutional research package...</p>
              ) : analysisStatus ? (
                <p className="text-sm text-white/52">{analysisStatus}</p>
              ) : null}
            </div>

            <p className="mt-5 text-xs leading-6 text-white/38">
              Research support only. Live quote snapshots load when available; not financial advice.
            </p>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <FileSearch className="h-6 w-6 text-emerald-200" />
              <div>
                <p className="text-sm text-white/50">Generated Intelligence</p>
                <h3 className="text-2xl font-semibold">
                  {result ? `${generated.ticker} — ${generated.company}` : "Awaiting analysis"}
                </h3>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="rounded-3xl border border-gold/25 bg-gold/10 p-6 text-sm leading-7 text-gold-light">
                Generating live AI research for {draftTicker.trim().toUpperCase() || "NVDA"}...
              </div>
            ) : !result ? (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm leading-7 text-white/55">
                Enter a ticker and press Analyze Ticker to generate institutional-style intelligence.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-emerald-100">Ticker Price Snapshot</p>
                      {generated.marketQuote ? (
                        <div className="mt-2 flex flex-wrap items-baseline gap-3">
                          <p className="text-4xl font-semibold text-white">
                            {formatMarketPrice(generated.marketQuote)}
                          </p>
                          {generated.marketQuote.change !== null && generated.marketQuote.changePercent !== null ? (
                            <p
                              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                                generated.marketQuote.change >= 0
                                  ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                                  : "border-red-300/35 bg-red-300/10 text-red-100"
                              }`}
                            >
                              {formatQuoteMove(generated.marketQuote.change)} (
                              {formatQuotePercent(generated.marketQuote.changePercent)})
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-2xl font-semibold text-white/70">Price unavailable</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Source</p>
                      <p className="mt-1 text-sm text-white/68">
                        {generated.marketQuote?.source ?? "Market quote service"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/45">
                    {generated.marketQuote
                      ? formatQuoteTime(generated.marketQuote.asOf)
                      : `No quote snapshot returned for ${generated.ticker}.`}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="mb-2 text-sm text-gold-light">Company Overview</p>
                  <p className="text-sm leading-7 text-white/65">{generated.about}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="mb-2 text-sm text-gold-light">Investment Thesis</p>
                  <p className="text-sm leading-7 text-white/65">{generated.thesis}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {thesisCases.map(({ title, body, Icon }) => {
                    return (
                      <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                        <Icon className="mb-3 h-5 w-5 text-gold-light" />
                        <p className="font-semibold">{title}</p>
                        <p className="mt-2 text-xs leading-6 text-white/55">{body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Activity className="h-6 w-6 text-gold-light" />
              <h3 className="text-2xl font-semibold">Signal Forecast</h3>
            </div>
            <div className="h-[300px]">
              <LineChartCanvas data={lineData(generated)} options={lineChartOptions} />
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-rose-200" />
              <h3 className="text-2xl font-semibold">Risk Exposure</h3>
            </div>
            <div className="h-[300px]">
              <Bar data={riskData(generated)} options={barChartOptions} />
            </div>
          </div>

          <div className="glass-panel relative rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Gauge className="h-6 w-6 text-emerald-200" />
              <h3 className="text-2xl font-semibold">Research Confidence</h3>
            </div>
            <div className="relative h-[300px]">
              <Doughnut data={confidenceData(generated)} options={doughnutOptions} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-semibold text-gold-light">{generated.confidence}%</p>
                <p className="text-sm text-white/45">Confidence</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <GitCompare className="h-6 w-6 text-gold-light" />
              <h3 className="text-2xl font-semibold">Competitor & Sector War Room</h3>
            </div>
            <div className="h-[360px]">
              <Bar data={competitorData(generated)} options={competitorChartOptions} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {generated.competitors.map((peer) => {
                const isPositive = (peer.change ?? 0) >= 0;

                return (
                  <div key={`${peer.peer}-${peer.symbol}`} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold text-white">{peer.symbol}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          isPositive
                            ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                            : "border-red-300/35 bg-red-300/10 text-red-100"
                        }`}
                      >
                        {peer.changePercent === null ? "Live" : formatQuotePercent(peer.changePercent)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-white/52">{peer.name}</p>
                    <p className="mt-4 text-2xl font-semibold text-gold-light">
                      {peer.price === null ? "Run analysis" : formatCurrencyValue(peer.price, peer.currency)}
                    </p>
                    <div className="mt-3 grid gap-1 text-xs leading-5 text-white/42">
                      <p>{formatVolume(peer.volume)}</p>
                      <p>{formatDayRange(peer)}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/38">
                      {peer.asOf ? formatQuoteTime(peer.asOf) : peer.source}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Crown className="h-6 w-6 text-gold-light" />
              <h3 className="text-2xl font-semibold">CEO / Leadership Intelligence</h3>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm leading-7 text-white/65">{generated.leadership}</p>
            </div>

            <div className="mt-4 grid gap-3">
              {intelligenceChecks.map(({ title, body, Icon }) => {
                return (
                  <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gold-light" />
                      <p className="font-semibold">{title}</p>
                    </div>
                    <p className="text-sm leading-6 text-white/58">{body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Building2 className="h-6 w-6 text-emerald-200" />
              <div>
                <p className="text-sm text-white/50">World Impact</p>
                <h3 className="text-2xl font-semibold">How this intelligence can benefit the world</h3>
              </div>
            </div>

            <p className="text-sm leading-7 text-white/62">{generated.worldImpact}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Better capital allocation", "Helps investors understand evidence, risks, and long-term value."],
                ["Stronger innovation signals", "Shows which companies may support productivity, infrastructure, and technology progress."],
                ["Smarter risk awareness", "Highlights what could confirm or invalidate a thesis before capital is exposed."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <p className="font-semibold text-gold-light">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Eye className="h-6 w-6 text-gold-light" />
              <div>
                <p className="text-sm text-white/50">Real-Life Example Explorer</p>
                <h3 className="text-2xl font-semibold">Tap an example to see how the thesis shows up</h3>
              </div>
            </div>

            <div className="space-y-3">
              {generated.examples.map((item) => (
                <details key={item.title} className="group rounded-3xl border border-white/10 bg-black/25 p-4 open:border-gold/35 open:bg-gold/10">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-white">{item.title}</p>
                      <ArrowRight className="h-4 w-4 text-gold-light transition group-open:rotate-90" />
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Real-world scenario</p>
                      <p className="mt-2 text-sm leading-6 text-white/62">{item.scenario}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Potential benefit</p>
                      <p className="mt-2 text-sm leading-6 text-white/62">{item.benefit}</p>
                    </div>

                    <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gold-light/80">Monitor this signal</p>
                      <p className="mt-2 text-sm leading-6 text-white/62">{item.signal}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Radar className="h-6 w-6 text-emerald-200" />
              <h3 className="text-2xl font-semibold">Monitoring Checklist</h3>
            </div>

            <div className="space-y-3">
              {generated.monitor.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  <span className="text-sm text-white/70">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Landmark className="h-6 w-6 text-gold-light" />
              <h3 className="text-2xl font-semibold">Institutional Edge</h3>
            </div>

            <p className="text-sm leading-7 text-white/62">
              This system does not say buy or sell. It structures the thesis, maps risks,
              compares competitors, evaluates leadership, identifies catalysts, defines invalidation points,
              and gives analysts a monitoring plan.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["What changed?", "Signal shift"],
                ["Who benefits?", "Competitive map"],
                ["What invalidates?", "Risk thesis"],
              ].map(([title, body]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <p className="font-semibold text-gold-light">{title}</p>
                  <p className="mt-2 text-sm text-white/55">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
