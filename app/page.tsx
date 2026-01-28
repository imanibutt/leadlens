"use client";


import { useState } from "react";


export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);


  const analyzeLead = async () => {
    setLoading(true);
    setResult("");


    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
      }),
    });


    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    try {
      const parsed = JSON.parse(text);
      setResult(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setResult(text);
    }
    setLoading(false);
  };


  return (
    <main style={{ padding: 40, maxWidth: 800 }}>
      <h1>LeadLens</h1>
      <p>Paste a client lead and let Gemini analyze it.</p>


      <textarea
        rows={6}
        style={{ width: "100%", padding: 10 }}
        placeholder="Example: Client wants a website for $50, timeline unclear, many revisions expected..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />


      <button
        onClick={analyzeLead}
        disabled={loading}
        style={{ marginTop: 12, padding: "10px 20px" }}
      >
        {loading ? "Analyzing..." : "Analyze Lead"}
      </button>


      {result && (
        <pre
          style={{
            marginTop: 20,
            padding: 15,
            background: "#111",
            color: "#0f0",
            whiteSpace: "pre-wrap",
          }}
        >
          {result}
        </pre>
      )}
    </main>
  );
}
