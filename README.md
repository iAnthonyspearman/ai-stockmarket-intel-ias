# AI Institutional Market Intelligence Terminal

An institutional-style market research terminal for ticker intelligence, thesis building, leadership review, risk exposure, catalyst tracking, competitor comparison, and AI-assisted monitoring.

The app preserves a black, gold, and emerald finance-terminal identity with a 3D Market Intelligence Helix, ticker analysis workflow, chart-driven intelligence panels, and an OpenAI-powered research route.

## Features

- 3D DNA / Market Intelligence Helix
- Analyze Ticker workflow
- Company Overview and Investment Thesis
- Bull, Bear, and Base cases
- Risk Exposure and Signal Forecast charts
- Competitor & Sector War Room
- CEO / Leadership Intelligence
- Market News & Catalyst Watch
- World Impact and Real-Life Example Explorer
- Monitoring Checklist and Institutional Edge

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- React Three Fiber / Drei / Three.js
- Chart.js / react-chartjs-2
- OpenAI API via `app/api/analyze/route.ts`

## Local Setup

Install dependencies:

```bash
npm install
```

Create `D:\AI Career Portfolio\ai-stockmarket-intel-ias\.env.local` with:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Deployment Notes

- Do not commit `.env.local`.
- Add `OPENAI_API_KEY` in Vercel Project Settings as an environment variable.
- `OPENAI_MODEL` is optional; the app defaults to `gpt-4o-mini`.
- The API route reads the key only from `process.env.OPENAI_API_KEY`.
- The UI includes local fallback research structure if the live AI request fails.

## Disclaimer

This project is a research simulation and portfolio application. It does not provide financial advice and does not issue buy, sell, or hold recommendations.
