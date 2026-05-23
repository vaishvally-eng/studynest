import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, updateDoc, orderBy
} from "firebase/firestore";

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  completedDates: string[];
  uid: string;
  createdAt: number;
  goal: number;
}

const COLORS = ["#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa","#f87171","#818cf8","#fb923c"];
const EMOJIS = ["📚","💧","🏃","🧘","✏️","🎯","💪","🍎","😴","🎵","🔥","⭐","🧠","🌿","☀️","🏋️"];

const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
};

const getLast30Days = () => {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
};

const getStreak = (dates: string[]) => {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 0;
  const check = new Date();
  for (const d of sorted) {
    const checkStr = check.toISOString().split("T")[0];
    if (d === checkStr) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
};

export default function HabitTracker() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [color, setColor] = useState("#a78bfa");
  const [goal, setGoal] = useState(7);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const today = new Date().toISOString().split("T")[0];
  const days = viewMode === "week" ? getLast7Days() : getLast30Days();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "habits"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, snap =>
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit)))
    );
  }, [user]);

  const saveHabit = async () => {
    if (!name.trim() || !user) return;
    await addDoc(collection(db, "habits"), {
      name: name.trim(), emoji, color, goal,
      completedDates: [], uid: user.uid, createdAt: Date.now()
    });
    setName(""); setEmoji("📚"); setColor("#a78bfa"); setGoal(7);
    setShowForm(false);
  };

  const toggleDay = async (habit: Habit, date: string) => {
    const already = habit.completedDates.includes(date);
    const updated = already
      ? habit.completedDates.filter(d => d !== date)
      : [...habit.completedDates, date];
    await updateDoc(doc(db, "habits", habit.id), { completedDates: updated });
  };

  const deleteHabit = async (id: string) => {
    await deleteDoc(doc(db, "habits", id));
  };

  const completedToday = habits.filter(h => h.completedDates.includes(today)).length;
  const totalHabits = habits.length;

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const panel = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "white", padding: "10px 14px", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "'Segoe UI',sans-serif"
  };
  const btn = (active = false, danger = false) => ({
    padding: "8px 20px", borderRadius: 10, border: "none", fontSize: "0.85rem",
    fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white"
  });

  const dayLabels = viewMode === "week"
    ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].slice(0,7)
    : days.map(d => new Date(d).getDate().toString());

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>🔥 Habit Tracker</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            {completedToday}/{totalHabits} habits done today
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={btn(true)}>+ New Habit</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Habits", value: totalHabits, color: "#a78bfa" },
          { label: "Done Today", value: completedToday, color: "#6ee7b7" },
          { label: "Best Streak", value: `${Math.max(0,...habits.map(h => getStreak(h.completedDates)))}🔥`, color: "#fbbf24" },
          { label: "This Week", value: habits.reduce((acc,h) => acc + getLast7Days().filter(d => h.completedDates.includes(d)).length, 0), color: "#60a5fa" },
        ].map(s => (
          <div key={s.label} style={{ ...panel, padding: "14px 18px" }}>
            <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["week","month"] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)} style={btn(viewMode === v)}>
            {v === "week" ? "📅 This Week" : "🗓️ This Month"}
          </button>
        ))}
      </div>

      {/* Habit grid */}
      {habits.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 80, color: "rgba(255,255,255,0.2)" }}>
          <p style={{ fontSize: "3rem" }}>🌱</p>
          <p>No habits yet — add one to get started!</p>
        </div>
      )}

      {habits.length > 0 && (
        <div style={{ ...panel, padding: "20px 24px", overflowX: "auto" as const }}>
          {/* Day header */}
          <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${days.length}, 1fr) 80px`, gap: 4, marginBottom: 12, alignItems: "center" }}>
            <div />
            {dayLabels.map((label, i) => (
              <div key={i} style={{
                textAlign: "center", fontSize: viewMode === "week" ? "0.75rem" : "0.65rem",
                color: days[i] === today ? "#a78bfa" : "rgba(255,255,255,0.35)",
                fontWeight: days[i] === today ? 700 : 400
              }}>{label}</div>
            ))}
            <div style={{ textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Streak</div>
          </div>

          {/* Habit rows */}
          {habits.map(habit => {
            const streak = getStreak(habit.completedDates);
            const monthDone = getLast30Days().filter(d => habit.completedDates.includes(d)).length;
            return (
              <div key={habit.id} style={{
                display: "grid", gridTemplateColumns: `220px repeat(${days.length}, 1fr) 80px`,
                gap: 4, alignItems: "center", marginBottom: 10
              }}>
                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: "1.3rem" }}>{habit.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{habit.name}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{monthDone}/30 this month</p>
                  </div>
                  <button onClick={() => deleteHabit(habit.id)} style={{ background: "none", border: "none", color: "rgba(255,100,100,0.4)", cursor: "pointer", fontSize: "0.85rem", flexShrink: 0, marginLeft: "auto" }}>✕</button>
                </div>

                {/* Day dots */}
                {days.map(date => {
                  const done = habit.completedDates.includes(date);
                  const isToday = date === today;
                  return (
                    <div key={date} onClick={() => toggleDay(habit, date)}
                      style={{
                        width: "100%", aspectRatio: "1", borderRadius: viewMode === "week" ? 10 : 6,
                        background: done ? habit.color : "rgba(255,255,255,0.06)",
                        border: isToday ? `2px solid ${habit.color}` : "2px solid transparent",
                        cursor: "pointer", transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: viewMode === "week" ? "0.9rem" : "0.6rem",
                        maxWidth: 36, margin: "0 auto"
                      }}>
                      {done && viewMode === "week" && "✓"}
                    </div>
                  );
                })}

                {/* Streak */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: streak > 0 ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>
                    {streak > 0 ? `${streak}🔥` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add habit form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 460 }}>
            <h3 style={{ margin: "0 0 20px" }}>🌱 New Habit</h3>

            <label style={{ display: "block", marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Habit name *</p>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Drink water, Read 20 mins..." style={inputStyle} autoFocus />
            </label>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Pick an emoji</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {EMOJIS.map(e => (
                  <span key={e} onClick={() => setEmoji(e)}
                    style={{ fontSize: "1.4rem", cursor: "pointer", padding: "4px 6px", borderRadius: 8,
                      background: emoji === e ? "rgba(124,58,237,0.3)" : "transparent",
                      border: emoji === e ? "1px solid #7c3aed" : "1px solid transparent" }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Color</p>
              <div style={{ display: "flex", gap: 8 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setColor(c)}
                    style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                      border: color === c ? "3px solid white" : "3px solid transparent" }} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={btn()}>Cancel</button>
              <button onClick={saveHabit} style={btn(true)} disabled={!name.trim()}>Add Habit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}