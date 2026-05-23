import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "nova";
  text: string;
}

const SUGGESTIONS = [
  "Help me make a study plan 📅",
  "Quiz me on any topic 🧠",
  "I need motivation ✨",
  "Explain a concept simply 💡",
  "Help me break down a task ✅",
];

export default function Nova() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "nova", text: "Hi! I'm Nova ✨ Your study companion. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are Nova ✨, a warm, encouraging AI study companion inside StudyNest — a student productivity app. 
You help students with:
- Study plans and schedules
- Explaining concepts simply
- Quizzing and testing knowledge  
- Motivation and encouragement
- Breaking down tasks
- Study tips and techniques
Keep responses concise, warm, and use occasional emojis. You're like a supportive study buddy!`,
          messages: [
            ...messages.map(m => ({ role: m.role === "nova" ? "assistant" : "user", content: m.text })),
            { role: "user", content: text.trim() }
          ]
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "I'm having trouble responding right now. Try again!";
      setMessages(m => [...m, { role: "nova", text: reply }]);
    } catch {
      setMessages(m => [...m, { role: "nova", text: "Oops! Something went wrong. Try again ✨" }]);
    }
    setLoading(false);
  };

  const width = isExpanded ? 480 : 360;
  const height = isExpanded ? 600 : 480;

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 1000,
          width, height,
          background: "var(--bg-card)",
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px var(--border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          transition: "all 0.3s ease",
          fontFamily: "'Segoe UI', sans-serif",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            background: "var(--gradient)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem"
              }}>✨</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "white", fontSize: "0.95rem" }}>Nova</p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.7)" }}>Your study companion</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setIsExpanded(e => !e)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "4px 8px", fontSize: "0.8rem" }}>
                {isExpanded ? "⊡" : "⊞"}
              </button>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "4px 8px", fontSize: "0.8rem" }}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "var(--gradient)" : "var(--bg-secondary)",
                  color: msg.role === "user" ? "white" : "var(--text-primary)",
                  fontSize: "0.88rem", lineHeight: "1.6",
                  border: msg.role === "nova" ? "1px solid var(--border-light)" : "none",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ padding: "10px 16px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--accent)",
                        animation: `bounce 1.2s ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Try asking:</p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    padding: "8px 14px", borderRadius: 12, border: "1px solid var(--border)",
                    background: "var(--bg-secondary)", color: "var(--text-secondary)",
                    cursor: "pointer", fontSize: "0.82rem", textAlign: "left",
                    transition: "all 0.15s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-light)", display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask Nova anything..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 14,
                border: "1px solid var(--border)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", outline: "none", fontSize: "0.88rem",
              }} />
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "none",
                background: "var(--gradient)", color: "white", cursor: "pointer",
                fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}>➤</button>
          </div>
        </div>
      )}

      {/* Floating island button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1001 }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: 58, height: 58, borderRadius: "50%", border: "none",
          background: "var(--gradient)",
          boxShadow: open ? "0 8px 32px rgba(249,123,92,0.5)" : "0 4px 20px rgba(249,123,92,0.35)",
          cursor: "pointer", fontSize: "1.5rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s ease",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}>
          {open ? "✕" : "✨"}
        </button>
        {!open && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", right: 0,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "6px 12px", whiteSpace: "nowrap",
            fontSize: "0.78rem", color: "var(--text-secondary)",
            boxShadow: "var(--shadow-card)",
            animation: "fadeIn 0.3s ease"
          }}>
            Nova is here ✨
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
