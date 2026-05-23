import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, updateDoc, orderBy
} from "firebase/firestore";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  date: string;
  uid: string;
  createdAt: number;
}

const MOODS = [
  { emoji: "😄", label: "Happy" },
  { emoji: "😊", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Sad" },
  { emoji: "😤", label: "Stressed" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🔥", label: "Motivated" },
  { emoji: "😰", label: "Anxious" },
];

const PROMPTS = [
  "What did I learn today?",
  "What am I grateful for?",
  "What challenged me today?",
  "What's on my mind right now?",
  "What do I want to achieve tomorrow?",
  "What made me smile today?",
  "What would I do differently?",
  "How am I feeling about my studies?",
];

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [view, setView] = useState<"list" | "write" | "read">("list");
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("😊");
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "journal"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, snap =>
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)))
    );
  }, [user]);

  const saveEntry = async () => {
    if (!content.trim() || !user) return;
    const data = {
      title: title.trim() || `Journal — ${today}`,
      content: content.trim(),
      mood,
      date: today,
      uid: user.uid,
    };
    if (editMode && selected) {
      await updateDoc(doc(db, "journal", selected.id), data);
    } else {
      await addDoc(collection(db, "journal"), { ...data, createdAt: Date.now() });
    }
    setTitle(""); setContent(""); setMood("😊");
    setEditMode(false); setSelected(null); setView("list");
  };

  const deleteEntry = async (id: string) => {
    await deleteDoc(doc(db, "journal", id));
    setView("list"); setSelected(null);
  };

  const openEntry = (entry: JournalEntry) => {
    setSelected(entry); setView("read");
  };

  const openEdit = (entry: JournalEntry) => {
    setTitle(entry.title); setContent(entry.content); setMood(entry.mood);
    setEditMode(true); setSelected(entry); setView("write");
  };

  const filtered = entries.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase())
  );

  const streak = (() => {
    const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
    let s = 0;
    let check = new Date();
    for (const d of dates) {
      const checkStr = check.toISOString().split("T")[0];
      if (d === checkStr) { s++; check.setDate(check.getDate() - 1); }
      else break;
    }
    return s;
  })();

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const panel = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "white", padding: "10px 14px", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "'Segoe UI', sans-serif"
  };
  const btn = (active = false, danger = false) => ({
    padding: "8px 20px", borderRadius: 10, border: "none", fontSize: "0.85rem",
    fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white"
  });

  // WRITE VIEW
  if (view === "write") return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>{editMode ? "✏️ Edit Entry" : "📝 New Entry"}</h2>
          <button onClick={() => { setView("list"); setEditMode(false); setTitle(""); setContent(""); setMood("😊"); }} style={btn()}>← Back</button>
        </div>

        {/* Mood picker */}
        <div style={{ ...panel, padding: "16px 20px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>How are you feeling?</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
            {MOODS.map(m => (
              <div key={m.emoji} onClick={() => setMood(m.emoji)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer",
                  padding: "8px 12px", borderRadius: 12,
                  background: mood === m.emoji ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.04)",
                  border: mood === m.emoji ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={`Journal — ${today}`}
          style={{ ...inputStyle, marginBottom: 12, fontSize: "1rem", padding: "12px 16px" }} />

        {/* Prompts */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 12 }}>
          {PROMPTS.slice(0, 4).map(p => (
            <button key={p} onClick={() => setContent(prev => prev ? prev + "\n\n" + p + "\n" : p + "\n")}
              style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", cursor: "pointer" }}>
              {p}
            </button>
          ))}
        </div>

        {/* Content */}
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Write your thoughts here... ✨"
          style={{ ...inputStyle, minHeight: 320, resize: "none", lineHeight: "1.8", fontSize: "0.95rem", marginBottom: 16 }} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => { setView("list"); setEditMode(false); }} style={btn()}>Cancel</button>
          <button onClick={saveEntry} style={btn(true)} disabled={!content.trim()}>
            {editMode ? "Save Changes" : "Save Entry"} ✨
          </button>
        </div>
      </div>
    </div>
  );

  // READ VIEW
  if (view === "read" && selected) return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <button onClick={() => setView("list")} style={btn()}>← Back</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openEdit(selected)} style={btn()}>✏️ Edit</button>
            <button onClick={() => deleteEntry(selected.id)} style={btn(false, true)}>🗑️ Delete</button>
          </div>
        </div>
        <div style={{ ...panel, padding: "32px 36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: "2rem" }}>{selected.mood}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{selected.title}</h2>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>{selected.date}</p>
            </div>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", margin: "20px 0" }} />
          <p style={{ margin: 0, lineHeight: "1.9", fontSize: "0.95rem", color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap" }}>{selected.content}</p>
        </div>
      </div>
    </div>
  );

  // LIST VIEW
  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>📝 Journal</h1>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
              {entries.length} entries · 🔥 {streak} day streak
            </p>
          </div>
          <button onClick={() => { setEditMode(false); setTitle(""); setContent(""); setMood("😊"); setView("write"); }} style={btn(true)}>
            + New Entry
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Entries", value: entries.length, color: "#a78bfa" },
            { label: "This Month", value: entries.filter(e => e.date.startsWith(today.slice(0,7))).length, color: "#60a5fa" },
            { label: "Streak", value: `${streak}🔥`, color: "#fbbf24" },
            { label: "Today", value: entries.filter(e => e.date === today).length > 0 ? "✅" : "—", color: "#6ee7b7" },
          ].map(s => (
            <div key={s.label} style={{ ...panel, padding: "14px 18px" }}>
              <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search entries..."
          style={{ ...inputStyle, marginBottom: 20 }} />

        {/* Entries */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 80, color: "rgba(255,255,255,0.2)" }}>
            <p style={{ fontSize: "3rem" }}>📖</p>
            <p>{entries.length === 0 ? "No entries yet — write your first one!" : "No entries match your search."}</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(entry => (
            <div key={entry.id} onClick={() => openEntry(entry)}
              style={{ ...panel, padding: "18px 22px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{entry.mood}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</p>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>{entry.date}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.83rem", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}