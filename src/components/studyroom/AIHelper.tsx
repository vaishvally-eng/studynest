import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string; }

export default function AIHelper({ roomName }: { roomName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hi! I'm your AI study helper for **${roomName}**. Ask me to explain a concept, quiz you, summarize notes, or generate flashcards! 🧠` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a helpful AI study assistant inside a study room called "${roomName}". Help students by explaining concepts clearly, creating quizzes, summarizing notes, generating flashcard questions, and answering study-related questions. Keep responses concise and encouraging. Use bullet points and structure for clarity.`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't respond. Try again!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again!" }]);
    }
    setLoading(false);
  };

  const quickActions = [
    "Explain this topic simply",
    "Quiz me on this subject",
    "Summarize my notes",
    "Create 5 flashcard questions",
    "Give me a study plan",
    "What are key points to remember?"
  ];

  const s = {
    container: { height: "100%", display: "flex", flexDirection: "column" as const },
    msgs: { flex: 1, overflowY: "auto" as const, padding: "20px", display: "flex", flexDirection: "column" as const, gap: "14px" },
    bubble: (isUser: boolean) => ({
      maxWidth: "75%", alignSelf: isUser ? "flex-end" as const : "flex-start" as const,
      background: isUser ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
      border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      padding: "12px 16px", fontSize: "0.9rem", lineHeight: "1.6", color: "white", whiteSpace: "pre-wrap" as const
    }),
    quickGrid: { display: "flex", flexWrap: "wrap" as const, gap: "8px", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" },
    quickBtn: { padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", cursor: "pointer" },
    inputRow: { display: "flex", gap: "10px", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", alignItems: "center" },
    input: { flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", padding: "10px 16px", outline: "none", fontSize: "0.9rem" },
    sendBtn: { width: "40px", height: "40px", borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" as const }
  };

  return (
    <div style={s.container}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.4rem" }}>🤖</span>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>AI Study Helper</p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Powered by Claude</p>
        </div>
      </div>

      <div style={s.msgs}>
        {messages.map((msg, i) => (
          <div key={i} style={s.bubble(msg.role === "user")}>
            {msg.role === "assistant" && <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", display: "block", marginBottom: "4px" }}>🤖 AI Helper</span>}
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={s.bubble(false)}>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", display: "block", marginBottom: "4px" }}>🤖 AI Helper</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={s.quickGrid}>
        {quickActions.map(a => (
          <button key={a} onClick={() => { setInput(a); }} style={s.quickBtn}>{a}</button>
        ))}
      </div>

      <div style={s.inputRow}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything about your studies..."
          style={s.input}
        />
        <button onClick={send} style={s.sendBtn} disabled={loading}>➤</button>
      </div>
    </div>
  );
}