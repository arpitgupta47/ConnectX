import fetch from "node-fetch";

export const aiChat = async (req, res) => {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "messages array required" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: "AI not configured on server. Add ANTHROPIC_API_KEY to backend .env" });
    }

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                system: systemPrompt || "You are a helpful AI Meeting Assistant inside ConnectX video meeting app. Be concise and helpful.",
                messages: messages
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Anthropic API error:", err);
            return res.status(response.status).json({ message: "AI service error", detail: err });
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || "Sorry, no response.";
        return res.status(200).json({ reply: text });

    } catch (e) {
        console.error("AI fetch error:", e.message);
        return res.status(500).json({ message: "AI service unavailable: " + e.message });
    }
};

