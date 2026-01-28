import { NextResponse } from "next/server";


export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();


        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Missing GEMINI_API_KEY in .env.local" },
                { status: 500 }
            );
        }


        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "Missing prompt in request body" },
                { status: 400 }
            );
        }


        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" +
            process.env.GEMINI_API_KEY,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: "You are LeadLens. Return ONLY valid JSON with these keys: " +
                                        "score (0-100), decision (Pursue|Negotiate|Decline), riskLevel (Low|Medium|High), " +
                                        "redFlags (array of strings), suggestedReply (string). " +
                                        "No markdown, no extra text.\n\nLead:\n" +
                                        prompt,
                                },
                            ],
                        },
                    ],
                }),
            }
        );


        const data = await response.json();


        if (!response.ok) {
            return NextResponse.json(
                { error: "Gemini API error", details: data },
                { status: 500 }
            );
        }


        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json(
            { error: "Server error", details: String(err?.message || err) },
            { status: 500 }
        );
    }
}
