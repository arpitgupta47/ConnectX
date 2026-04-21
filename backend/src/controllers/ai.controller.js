// Groq API — Bilkul FREE, koi credit card nahi chahiye
 
export const aiChat = async (req, res) => {
    const { messages, systemPrompt } = req.body;
 
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "messages array required" });
    }
 
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: "AI not configured. Add GROQ_API_KEY to Render environment." });
    }
 
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                max_tokens: 1024,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt || "You are a helpful AI Meeting Assistant inside ConnectX video meeting app. Be concise and helpful."
                    },
                    ...messages
                ]
            })
        });
 
        if (!response.ok) {
            const err = await response.text();
            console.error("Groq API error:", err);
            return res.status(response.status).json({ message: "AI service error", detail: err });
        }
 
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "Sorry, no response.";
        return res.status(200).json({ reply: text });
 
    } catch (e) {
        console.error("AI fetch error:", e.message);
        return res.status(500).json({ message: "AI service unavailable: " + e.message });
    }
};
