import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, updateDoc, orderBy
} from "firebase/firestore";

interface Task {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  dueDate?: string;
  dueTime?: string;
  reminderTime?: string;
  reminderDate?: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  uid: string;
  createdAt: number;
  reminderFired?: boolean;
}

const PRIORITIES = {
  high:   { label: "High",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  medium: { label: "Medium", color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  low:    { label: "Low",    color: "#6ee7b7", bg: "rgba(110,231,183,0.12)" },
};

const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology", "English", "History", "Computer Science", "Other"];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"all" | "today" | "completed">("all");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [firingAlarm, setFiringAlarm] = useState<Task | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))));
  }, [user]);

  // Reminder checker — runs every 30 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const nowDate = now.toISOString().split("T")[0];
      const nowTime = now.toTimeString().slice(0, 5);
      tasks.forEach(task => {
        if (task.completed || task.reminderFired) return;
        if (task.reminderDate === nowDate && task.reminderTime === nowTime) {
          triggerAlarm(task);
          updateDoc(doc(db, "tasks", task.id), { reminderFired: true });
        }
      });
    };
    const interval = setInterval(check, 30000);
    check();
    return () => clearInterval(interval);
  }, [tasks]);

  const triggerAlarm = (task: Task) => {
    setFiringAlarm(task);
    playAlarmSound();
    // Request notification permission and show notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏰ StudyNest Reminder", {
        body: `${task.title}${task.subject ? ` — ${task.subject}` : ""}`,
        icon: "/favicon.ico"
      });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then(p => {
        if (p === "granted") {
          new Notification("⏰ StudyNest Reminder", {
            body: `${task.title}${task.subject ? ` — ${task.subject}` : ""}`,
          });
        }
      });
    }
  };

  const playAlarmSound = () => {
    try {
      audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      let count = 0;
      alarmIntervalRef.current = setInterval(() => {
        if (count >= 6) { stopAlarm(); return; }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = count % 2 === 0 ? 880 : 660;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        count++;
      }, 500);
    } catch {}
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    try { audioRef.current?.close(); } catch {}
    setFiringAlarm(null);
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setSubject("");
    setDueDate(""); setDueTime(""); setReminderDate("");
    setReminderTime(""); setPriority("medium");
    setEditTask(null); setShowForm(false);
  };

  const openEdit = (task: Task) => {
    setTitle(task.title); setDescription(task.description || "");
    setSubject(task.subject || ""); setDueDate(task.dueDate || "");
    setDueTime(task.dueTime || ""); setReminderDate(task.reminderDate || "");
    setReminderTime(task.reminderTime || ""); setPriority(task.priority);
    setEditTask(task); setShowForm(true);
  };

  const saveTask = async () => {
    if (!title.trim() || !user) return;
    const data = {
      title: title.trim(), description, subject, dueDate, dueTime,
      reminderDate, reminderTime, priority, uid: user.uid, reminderFired: false
    };
    if (editTask) {
      await updateDoc(doc(db, "tasks", editTask.id), data);
    } else {
      await addDoc(collection(db, "tasks"), { ...data, completed: false, createdAt: Date.now() });
    }
    resetForm();
  };

  const toggleComplete = async (task: Task) => {
    await updateDoc(doc(db, "tasks", task.id), { completed: !task.completed });
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  const today = new Date().toISOString().split("T")[0];

  const filtered = tasks.filter(t => {
    if (view === "today") return t.dueDate === today && !t.completed;
    if (view === "completed") return t.completed;
    return !t.completed;
  }).filter(t => filter === "all" || t.priority === filter);

  const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  const completedCount = tasks.filter(t => t.completed).length;

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "white", padding: "10px 14px", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "'Segoe UI', sans-serif"
  };
  const btn = (active = false, danger = false, small = false) => ({
    padding: small ? "6px 12px" : "9px 20px", borderRadius: "10px", border: "none",
    fontSize: small ? "0.78rem" : "0.85rem", fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white",
  });

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI', sans-serif", padding: "32px" }}>

      {/* Alarm popup */}
      {firingAlarm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#2d1b69)", border: "2px solid #7c3aed", borderRadius: 24, padding: "40px 52px", textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 12, animation: "pulse 1s infinite" }}>⏰</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.4rem" }}>Reminder!</h2>
            <p style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#a78bfa", fontWeight: 600 }}>{firingAlarm.title}</p>
            {firingAlarm.subject && <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>{firingAlarm.subject}</p>}
            {firingAlarm.dueDate && <p style={{ margin: "0 0 20px", color: "#fbbf24", fontSize: "0.85rem" }}>Due: {firingAlarm.dueDate} {firingAlarm.dueTime}</p>}
            <button onClick={stopAlarm} style={{ ...btn(true), padding: "12px 36px", fontSize: "1rem" }}>Dismiss ✓</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>✅ Tasks</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            {completedCount}/{tasks.length} completed
            {overdue.length > 0 && <span style={{ color: "#f87171", marginLeft: 12 }}>⚠️ {overdue.length} overdue</span>}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={btn(true)}>+ New Task</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Pending", value: tasks.filter(t => !t.completed).length, color: "#a78bfa" },
          { label: "Due Today", value: tasks.filter(t => t.dueDate === today && !t.completed).length, color: "#60a5fa" },
          { label: "Overdue", value: overdue.length, color: "#f87171" },
          { label: "Completed", value: completedCount, color: "#6ee7b7" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const }}>
        {(["all","today","completed"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={btn(view === v, false, true)}>
            {v === "all" ? "📋 All" : v === "today" ? "📅 Today" : "✅ Done"}
          </button>
        ))}
        <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
        {(["all","high","medium","low"] as const).map(p => (
          <button key={p} onClick={() => setFilter(p)} style={{ ...btn(filter === p, false, true), color: p !== "all" ? PRIORITIES[p].color : "white" }}>
            {p === "all" ? "All" : PRIORITIES[p].label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 80, color: "rgba(255,255,255,0.2)" }}>
          <p style={{ fontSize: "2.5rem" }}>🌸</p>
          <p>No tasks here!</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(task => {
          const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
          const p = PRIORITIES[task.priority];
          const hasReminder = task.reminderDate && task.reminderTime;
          return (
            <div key={task.id} style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${isOverdue ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 14, padding: "14px 18px"
            }}>
              <div onClick={() => toggleComplete(task)} style={{
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${task.completed ? "#7c3aed" : "rgba(255,255,255,0.25)"}`,
                background: task.completed ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent",
                cursor: "pointer", flexShrink: 0, marginTop: 2,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "white"
              }}>
                {task.completed && "✓"}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "rgba(255,255,255,0.35)" : "white" }}>
                    {task.title}
                  </span>
                  <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 20, background: p.bg, color: p.color, fontWeight: 600 }}>{p.label}</span>
                  {task.subject && <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 20, background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>{task.subject}</span>}
                  {isOverdue && <span style={{ fontSize: "0.72rem", color: "#f87171" }}>⚠️ Overdue</span>}
                </div>
                {task.description && <p style={{ margin: "0 0 5px", fontSize: "0.83rem", color: "rgba(255,255,255,0.45)" }}>{task.description}</p>}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const }}>
                  {task.dueDate && <span style={{ fontSize: "0.78rem", color: isOverdue ? "#f87171" : "rgba(255,255,255,0.35)" }}>📅 {task.dueDate} {task.dueTime && `• ${task.dueTime}`}</span>}
                  {hasReminder && <span style={{ fontSize: "0.78rem", color: task.reminderFired ? "rgba(255,255,255,0.25)" : "#fbbf24" }}>🔔 {task.reminderDate} {task.reminderTime}{task.reminderFired ? " (done)" : ""}</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(task)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1rem" }}>✏️</button>
                <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "1rem" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" as const }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "1.1rem" }}>{editTask ? "✏️ Edit Task" : "➕ New Task"}</h3>

            <label style={{ display: "block", marginBottom: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Task title *</p>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" style={inputStyle} autoFocus />
            </label>

            <label style={{ display: "block", marginBottom: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Description</p>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..."
                style={{ ...inputStyle, resize: "none", minHeight: 68, lineHeight: "1.6" }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Subject</p>
                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, appearance: "none" as const }}>
                  <option value="">None</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Priority</p>
                <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ ...inputStyle, appearance: "none" as const }}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Due date</p>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </label>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Due time</p>
                <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </label>
            </div>

            {/* Reminder section */}
            <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.85rem", fontWeight: 600, color: "#fbbf24" }}>🔔 Set Reminder (Alarm)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <p style={{ margin: "0 0 6px", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>Reminder date</p>
                  <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </label>
                <label>
                  <p style={{ margin: "0 0 6px", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>Reminder time</p>
                  <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </label>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>App must be open for alarm to ring</p>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={btn()}>Cancel</button>
              <button onClick={saveTask} style={btn(true)} disabled={!title.trim()}>{editTask ? "Save Changes" : "Add Task"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}