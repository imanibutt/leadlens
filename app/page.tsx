"use client";

import { useMemo, useState } from "react";

type Parsed = {
  verdict?: string;
  risk?: string;
  redFlags?: string[];
  reply?: string;
};

function parseGeminiText(raw: string): Parsed {
  const text = raw || "";
  try {
    const json = JSON.parse(text);
    return {
      verdict: json.decision,
      risk: json.riskLevel,
      redFlags: json.redFlags,
      reply: json.suggestedReply,
    };
  } catch (e) {
    // Fallback manual parsing if JSON fails
  }

  const lower = text.toLowerCase();

  // Verdict
  let verdict =
    lower.includes("verdict") && lower.includes("good")
      ? "Good"
      : lower.includes("verdict") && lower.includes("bad")
        ? "Bad"
        : undefined;

  // Risk
  let risk =
    lower.includes("risk") && lower.includes("high")
      ? "High"
      : lower.includes("risk") && lower.includes("medium")
        ? "Medium"
        : lower.includes("risk") && lower.includes("low")
          ? "Low"
          : undefined;

  // Red flags
  const redFlags: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let inRedFlags = false;
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes("red flag")) {
      inRedFlags = true;
      continue;
    }
    if (inRedFlags && (l.startsWith("suggested reply") || l.startsWith("reply"))) {
      inRedFlags = false;
    }
    if (inRedFlags) {
      const cleaned = line.replace(/^[-•*]\s*/, "").trim();
      if (cleaned && cleaned.length > 2) redFlags.push(cleaned);
    }
  }

  // Suggested reply
  let reply: string | undefined;
  const replyIndex = lines.findIndex((l) => l.toLowerCase().includes("suggested reply"));
  if (replyIndex !== -1) {
    reply = lines.slice(replyIndex + 1).join("\n").trim() || undefined;
  }

  return { verdict, risk, redFlags: redFlags.length ? redFlags : undefined, reply };
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseGeminiText(raw), [raw]);

  const analyzeLead = async () => {
    setLoading(true);
    setErr(null);
    setRaw("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data?.error || "Request failed.");
        setLoading(false);
        return;
      }

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response from Gemini.";

      setRaw(text);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (parsed.reply) {
      navigator.clipboard.writeText(parsed.reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Visual Styles
  const verdictColor =
    parsed.verdict === "Pursue"
      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
      : parsed.verdict === "Decline"
        ? "bg-rose-500/10 text-rose-400 ring-rose-500/20"
        : parsed.verdict === "Negotiate"
          ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
          : "bg-zinc-800 text-zinc-400 ring-zinc-700"; // Default/Idle

  const riskColor =
    parsed.risk === "High"
      ? "text-rose-400"
      : parsed.risk === "Medium"
        ? "text-amber-400"
        : parsed.risk === "Low"
          ? "text-emerald-400"
          : "text-zinc-500";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">LeadLens</h1>
            <p className="mt-2 text-zinc-400 max-w-lg">
              Reasoning assistance for freelancers. Paste a lead to get a verdict, risk assessment, and response strategy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {raw && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Result Ready
              </span>
            )}
            <div className={`rounded-lg bg-zinc-900 px-3 py-2 ring-1 ring-zinc-800 transition ${loading ? 'opacity-100' : 'opacity-60'}`}>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</div>
              <div className="text-xs font-medium text-zinc-300">
                {loading ? "Analyzing..." : "Idle"}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Input Panel */}
          <div className="flex flex-col gap-4">
            <div className="relative rounded-2xl bg-zinc-900/40 p-1 ring-1 ring-zinc-800 transition-all focus-within:ring-zinc-700">
              <textarea
                className="block h-80 w-full resize-none rounded-xl bg-transparent p-5 text-sm leading-7 text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                placeholder="Paste client email or message here...
                
Example: 'Hi, I need a full e-commerce site. Budget is $500. Needed by Friday. Unlimited revisions required.'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />

              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setRaw("");
                    setErr(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Clear
                </button>
                <button
                  onClick={analyzeLead}
                  disabled={loading || !prompt.trim()}
                  className="rounded-lg bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? "Thinking..." : "Analyze Lead"}
                </button>
              </div>
            </div>

            {err && (
              <div className="rounded-xl bg-rose-500/10 p-4 ring-1 ring-rose-500/20">
                <p className="text-sm font-medium text-rose-200">Error</p>
                <p className="text-xs text-rose-300/80 mt-1">{err}</p>
              </div>
            )}

            <p className="text-xs text-zinc-500 px-2">
              Tip: Provide details on budget, timeline, and scope for best results.
            </p>
          </div>

          {/* Output Panel */}
          <div className={`flex flex-col gap-5 rounded-2xl bg-zinc-900/40 p-6 ring-1 ring-zinc-800 transition-all duration-500 ${raw ? 'opacity-100' : 'opacity-50 grayscale'}`}>

            {/* 1. Verdict & Risk Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-5">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Verdict</div>
                <span className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-bold ring-1 ring-inset ${verdictColor}`}>
                  {parsed.verdict || "Waiting for input..."}
                </span>
              </div>

              <div className="text-right space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Risk Level</div>
                <div className={`text-sm font-bold ${riskColor}`}>
                  {parsed.risk || "—"}
                </div>
              </div>
            </div>

            {/* 2. Red Flags */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-zinc-400">Key Risk Factors</div>
              {parsed.redFlags && parsed.redFlags.length > 0 ? (
                <ul className="grid gap-2">
                  {parsed.redFlags.slice(0, 4).map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/50" />
                      {flag}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-zinc-600 italic">No red flags detected yet.</div>
              )}
            </div>

            {/* 3. Suggested Reply */}
            <div className="mt-2 space-y-3 rounded-xl bg-zinc-950/50 p-5 ring-1 ring-zinc-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-zinc-400">Suggested Response</div>
                {parsed.reply && (
                  <button
                    onClick={handleCopy}
                    className="group flex items-center gap-1.5 rounded-md bg-zinc-800/50 px-2 py-1 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    {copied ? (
                      <span className="text-emerald-400">Copied!</span>
                    ) : (
                      <span>Copy Text</span>
                    )}
                  </button>
                )}
              </div>
              <p className="text-sm leading-6 text-zinc-300 whitespace-pre-wrap">
                {parsed.reply || "Draft reply will appear here..."}
              </p>
            </div>

            {/* 4. Raw Output (Secondary) */}
            <details className="mt-auto pt-4 group">
              <summary className="flex cursor-pointer items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600 hover:text-zinc-500">
                <span>View Raw Model Output</span>
                <svg className="h-3 w-3 rotate-0 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 text-[10px] leading-5 text-emerald-500/80 font-mono ring-1 ring-white/5">
                {raw || "No data."}
              </pre>
            </details>

          </div>
        </section>

        <footer className="py-12 text-center">
          <p className="text-xs text-zinc-600">
            LeaderLens AI • Designed for independent consultants
          </p>
        </footer>
      </div>
    </main>
  );
}
