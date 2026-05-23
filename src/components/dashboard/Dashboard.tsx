import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import SpotifyWidget from "../spotify/SpotifyWidget";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const username = (user as any)?.username || user?.displayName || user?.email?.split("@")[0] || "User";

  const [tasks, setTasks] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "tasks"), where("uid", "==", user.uid)), snap =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "exams"), where("uid", "==", user.uid), orderBy("date", "asc")), snap =>
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "habits"), where("uid", "==", user.uid)), snap =>
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "journal"), where("uid", "==", user.uid), orderBy("createdAt", "desc")), snap =>
      setJournalEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getDaysLeft = (dateStr: string) => {
    const t = new Date(); t.setHours(0,0,0,0);
    const e = new Date(dateStr); e.setHours(0,0,0,0);
    return Math.ceil((e.getTime() - t.getTime()) / (1000*60*60*24));
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const todayTasks = tasks.filter(t => t.dueDate === today && !t.completed);
  const nextExam = exams.find(e => e.date >= today && !e.done);
  const habitsToday = habits.filter(h => h.completedDates?.includes(today)).length;
  const todayJournal = journalEntries.find(e => e.date === today);
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);

  const journalStreak = (() => {
    const dates = [...new Set(journalEntries.map((e: any) => e.date))].sort().reverse();
    let s = 0; const check = new Date();
    for (const d of dates) {
      if (d === check.toISOString().split("T")[0]) { s++; check.setDate(check.getDate()-1); } else break;
    }
    return s;
  })();

  const card = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    boxShadow: "var(--shadow-card)",
  };

  const QUICK_LINKS = [
    { emoji: "✅", label: "Tasks", path: "/tasks", color: "var(--accent)", count: pendingTasks.length, sub: "pending" },
    { emoji: "📝", label: "Journal", path: "/journal", color: "#f472b6", count: journalEntries.length, sub: "entries" },
    { emoji: "🔥", label: "Habits", path: "/habits", color: "#fbbf24", count: habitsToday, sub: `of ${habits.length} today` },
    { emoji: "📅", label: "Exams", path: "/exams", color: "#60a5fa", count: exams.filter(e => e.date >= today && !e.done).length, sub: "upcoming" },
    { emoji: "🏫", label: "Study Rooms", path: "/studyroom", color: "#34d399", count: null, sub: "join or create" },
    { emoji: "💬", label: "Messages", path: "/messaging", color: "#fb923c", count: null, sub: "chat with friends" },
    { emoji: "👥", label: "Friends", path: "/friends", color: "#818cf8", count: null, sub: "your network" },
    { emoji: "⏰", label: "Alarm", path: "/alarm", color: "#f87171", count: null, sub: "set reminders" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <h1 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {getGreeting()}, {username} 👋
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {todayTasks.length > 0
            ? `You have ${todayTasks.length} task${todayTasks.length > 1 ? "s" : ""} due today.`
            : "You're all caught up for today! 🌸"}
          {overdueTasks.length > 0 && <span style={{ color: "#f87171", marginLeft: 10 }}>⚠️ {overdueTasks.length} overdue</span>}
        </p>
      </div>

      {/* Exam alert */}
      {nextExam && getDaysLeft(nextExam.date) <= 3 && (
        <div style={{ background: "rgba(249,123,92,0.08)", border: "1px solid rgba(249,123,92,0.25)", borderRadius: 16, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.3rem" }}>⚠️</span>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)" }}>
            <strong>{nextExam.subject}</strong> exam in <strong style={{ color: "var(--accent)" }}>{getDaysLeft(nextExam.date)} day{getDaysLeft(nextExam.date) !== 1 ? "s" : ""}!</strong>
            {nextExam.topic && ` — ${nextExam.topic}`}
          </p>
          <button onClick={() => navigate("/exams")} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 10, border: "1px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}>View</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Pending Tasks", value: pendingTasks.length, color: "var(--accent)", icon: "✅" },
          { label: "Habits Today", value: `${habitsToday}/${habits.length}`, color: "#fbbf24", icon: "🔥" },
          { label: "Next Exam", value: nextExam ? `${getDaysLeft(nextExam.date)}d` : "—", color: "#60a5fa", icon: "📅" },
          { label: "Journal Streak", value: `${journalStreak}🔥`, color: "#f472b6", icon: "📝" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "1.9rem", fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.label}</p>
              </div>
              <span style={{ fontSize: "1.4rem" }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Due Today */}
        <div style={{ ...card, padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)" }}>✅ Due Today</h3>
            <button onClick={() => navigate("/tasks")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>View all →</button>
          </div>
          {todayTasks.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>No tasks due today 🌸</p>}
          {todayTasks.slice(0, 4).map((task: any) => (
            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: task.priority === "high" ? "#f87171" : task.priority === "medium" ? "#fbbf24" : "#6ee7b7", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: "0.88rem", flex: 1, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
            </div>
          ))}
        </div>

        {/* Next Exam */}
        <div style={{ ...card, padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)" }}>📅 Next Exam</h3>
            <button onClick={() => navigate("/exams")} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>View all →</button>
          </div>
          {!nextExam
            ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>No upcoming exams 🎉</p>
            : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "center", background: "var(--accent-soft)", borderRadius: 16, padding: "12px 18px", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>{getDaysLeft(nextExam.date)}</p>
                  <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--text-muted)" }}>days left</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{nextExam.subject}</p>
                  {nextExam.topic && <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{nextExam.topic}</p>}
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{nextExam.date}</p>
                </div>
              </div>
            )}
        </div>

        {/* Habits */}
        <div style={{ ...card, padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)" }}>🔥 Today's Habits</h3>
            <button onClick={() => navigate("/habits")} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>View all →</button>
          </div>
          {habits.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>No habits yet!</p>}
          {habits.slice(0, 4).map((habit: any) => {
            const done = habit.completedDates?.includes(today);
            return (
              <div key={habit.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "1.1rem" }}>{habit.emoji}</span>
                <p style={{ margin: 0, fontSize: "0.88rem", flex: 1, color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>{habit.name}</p>
                <span>{done ? "✅" : "⬜"}</span>
              </div>
            );
          })}
        </div>

        {/* Journal */}
        <div style={{ ...card, padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)" }}>📝 Journal</h3>
            <button onClick={() => navigate("/journal")} style={{ background: "none", border: "none", color: "#f472b6", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Open →</button>
          </div>
          {todayJournal ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: "1.5rem" }}>{todayJournal.mood}</span>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{todayJournal.title}</p>
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{todayJournal.content}</p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>No entry today yet</p>
              <button onClick={() => navigate("/journal")} style={{ padding: "8px 20px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                Write Today's Entry ✨
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spotify */}
      <div style={{ marginBottom: 24 }}>
        <SpotifyWidget />
      </div>

      {/* Quick links */}
      <h3 style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Quick Access</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {QUICK_LINKS.map(link => (
          <div key={link.path} onClick={() => navigate(link.path)}
            style={{ ...card, padding: "16px 18px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-card-hover)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <span style={{ fontSize: "1.6rem", display: "block", marginBottom: 6 }}>{link.emoji}</span>
            <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{link.label}</p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: link.color }}>
              {link.count !== null ? `${link.count} ${link.sub}` : link.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}