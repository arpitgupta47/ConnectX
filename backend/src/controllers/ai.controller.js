// Google Gemini API — Bilkul FREE, koi credit card nahi chahiye

export const aiChat = async (req, res) => {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "messages array required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: "AI not configured. Add GEMINI_API_KEY to backend .env on Render." });
    }

    try {
        // OpenAI format (role: user/assistant) ko Gemini format mein convert karo
        const geminiMessages = messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{
                            text: systemPrompt || "You are a helpful AI Meeting Assistant inside ConnectX video meeting app. Be concise and helpful."
                        }]
                    },
                    contents: geminiMessages
                })
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error("Gemini API error:", err);
            return res.status(response.status).json({ message: "AI service error", detail: err });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, no response.";
        return res.status(200).json({ reply: text });

    } catch (e) {
        console.error("AI fetch error:", e.message);
        return res.status(500).json({ message: "AI service unavailable: " + e.message });
    }
};
