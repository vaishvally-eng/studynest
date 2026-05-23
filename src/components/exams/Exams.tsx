import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, updateDoc, orderBy
} from "firebase/firestore";

interface Exam {
  id: string;
  subject: string;
  topic: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  uid: string;
  createdAt: number;
  done: boolean;
}

const SUBJECTS = ["Math","Physics","Chemistry","Biology","English","History","Computer Science","Economics","Geography","Other"];
const SUBJECT_COLORS: Record<string, string> = {
  Math: "#60a5fa", Physics: "#a78bfa", Chemistry: "#f472b6",
  Biology: "#34d399", English: "#fbbf24", History: "#fb923c",
  "Computer Science": "#818cf8", Economics: "#6ee7b7",
  Geography: "#f87171", Other: "#94a3b8"
};

const getDaysLeft = (dateStr: string) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const exam = new Date(dateStr); exam.setHours(0,0,0,0);
  return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function Exams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const [subject, setSubject] = useState("Math");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "exams"),
      where("uid", "==", user.uid),
      orderBy("date", "asc")
    );
    return onSnapshot(q, snap =>
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)))
    );
  }, [user]);

  const resetForm = () => {
    setSubject("Math"); setTopic(""); setDate("");
    setTime(""); setLocation(""); setNotes("");
    setEditExam(null); setShowForm(false);
  };

  const openEdit = (exam: Exam) => {
    setSubject(exam.subject); setTopic(exam.topic);
    setDate(exam.date); setTime(exam.time);
    setLocation(exam.location); setNotes(exam.notes);
    setEditExam(exam); setShowForm(true);
  };

  const saveExam = async () => {
    if (!date || !user) return;
    const data = { subject, topic, date, time, location, notes, uid: user.uid, done: false };
    if (editExam) {
      await updateDoc(doc(db, "exams", editExam.id), data);
    } else {
      await addDoc(collection(db, "exams"), { ...data, createdAt: Date.now() });
    }
    resetForm();
  };

  const deleteExam = async (id: string) => {
    await deleteDoc(doc(db, "exams", id));
  };

  const toggleDone = async (exam: Exam) => {
    await updateDoc(doc(db, "exams", exam.id), { done: !exam.done });
  };

  const filtered = exams.filter(e => {
    if (filter === "upcoming") return e.date >= today && !e.done;
    if (filter === "past") return e.date < today || e.done;
    return true;
  });

  const next = exams.find(e => e.date >= today && !e.done);
  const nextDays = next ? getDaysLeft(next.date) : null;

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const panel = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "white", padding: "10px 14px", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "'Segoe UI',sans-serif"
  };
  const btn = (active = false, danger = false, small = false) => ({
    padding: small ? "6px 14px" : "9px 22px", borderRadius: 10, border: "none",
    fontSize: small ? "0.8rem" : "0.85rem", fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white"
  });

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>📅 Exams</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            {exams.filter(e => e.date >= today && !e.done).length} upcoming exams
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={btn(true)}>+ Add Exam</button>
      </div>

      {/* Next exam banner */}
      {next && nextDays !== null && (
        <div style={{
          background: nextDays <= 3 ? "rgba(248,113,113,0.1)" : nextDays <= 7 ? "rgba(251,191,36,0.1)" : "rgba(124,58,237,0.1)",
          border: `1px solid ${nextDays <= 3 ? "rgba(248,113,113,0.3)" : nextDays <= 7 ? "rgba(251,191,36,0.3)" : "rgba(124,58,237,0.3)"}`,
          borderRadius: 16, padding: "20px 24px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 20
        }}>
          <div style={{ textAlign: "center", minWidth: 70 }}>
            <p style={{ margin: 0, fontSize: "2.8rem", fontWeight: 800, lineHeight: 1,
              color: nextDays <= 3 ? "#f87171" : nextDays <= 7 ? "#fbbf24" : "#a78bfa" }}>
              {nextDays === 0 ? "Today" : nextDays}
            </p>
            {nextDays > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>days left</p>}
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Next Exam</p>
            <p style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700 }}>{next.subject} {next.topic && `— ${next.topic}`}</p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
              {next.date} {next.time && `at ${next.time}`} {next.location && `• ${next.location}`}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Upcoming", value: exams.filter(e => e.date >= today && !e.done).length, color: "#a78bfa" },
          { label: "This Week", value: exams.filter(e => { const d = getDaysLeft(e.date); return d >= 0 && d <= 7 && !e.done; }).length, color: "#fbbf24" },
          { label: "Completed", value: exams.filter(e => e.done || e.date < today).length, color: "#6ee7b7" },
          { label: "Total", value: exams.length, color: "#60a5fa" },
        ].map(s => (
          <div key={s.label} style={{ ...panel, padding: "14px 18px" }}>
            <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["upcoming","past","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={btn(filter === f, false, true)}>
            {f === "upcoming" ? "📅 Upcoming" : f === "past" ? "✅ Past" : "📋 All"}
          </button>
        ))}
      </div>

      {/* Exam list */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 80, color: "rgba(255,255,255,0.2)" }}>
          <p style={{ fontSize: "3rem" }}>📚</p>
          <p>{exams.length === 0 ? "No exams added yet!" : "No exams in this category."}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(exam => {
          const daysLeft = getDaysLeft(exam.date);
          const isPast = exam.date < today || exam.done;
          const subjectColor = SUBJECT_COLORS[exam.subject] || "#94a3b8";
          const urgentColor = daysLeft <= 3 ? "#f87171" : daysLeft <= 7 ? "#fbbf24" : "#a78bfa";

          return (
            <div key={exam.id} style={{
              ...panel, padding: "18px 22px",
              opacity: isPast ? 0.6 : 1,
              borderLeft: `4px solid ${subjectColor}`
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>

                {/* Countdown badge */}
                {!isPast && (
                  <div style={{ textAlign: "center", minWidth: 54, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "8px 4px", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: urgentColor, lineHeight: 1 }}>
                      {daysLeft === 0 ? "!" : daysLeft}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
                      {daysLeft === 0 ? "today" : "days"}
                    </p>
                  </div>
                )}

                {isPast && (
                  <div style={{ textAlign: "center", minWidth: 54, background: "rgba(110,231,183,0.08)", borderRadius: 12, padding: "8px 4px", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: "1.4rem" }}>✅</p>
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: 20, background: `${subjectColor}22`, color: subjectColor, fontWeight: 700 }}>
                      {exam.subject}
                    </span>
                    {!isPast && daysLeft <= 3 && (
                      <span style={{ fontSize: "0.72rem", color: "#f87171" }}>⚠️ Soon!</span>
                    )}
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 600 }}>
                    {exam.topic || exam.subject + " Exam"}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>📅 {exam.date}</span>
                    {exam.time && <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>⏰ {exam.time}</span>}
                    {exam.location && <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>📍 {exam.location}</span>}
                  </div>
                  {exam.notes && <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>📝 {exam.notes}</p>}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleDone(exam)} title={exam.done ? "Mark undone" : "Mark done"}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: exam.done ? "#6ee7b7" : "rgba(255,255,255,0.3)" }}>✓</button>
                  <button onClick={() => openEdit(exam)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1rem" }}>✏️</button>
                  <button onClick={() => deleteExam(exam.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "1rem" }}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" as const }}>
            <h3 style={{ margin: "0 0 20px" }}>{editExam ? "✏️ Edit Exam" : "📅 Add Exam"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Subject *</p>
                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, appearance: "none" as const }}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Topic / Chapter</p>
                <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Chapter 5, Algebra..." style={inputStyle} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Exam date *</p>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </label>
              <label>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Exam time</p>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </label>
            </div>

            <label style={{ display: "block", marginBottom: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Location / Hall</p>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Room 204, Main Hall..." style={inputStyle} />
            </label>

            <label style={{ display: "block", marginBottom: 20 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Notes</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Topics to focus on, materials needed..."
                style={{ ...inputStyle, resize: "none", minHeight: 80, lineHeight: "1.6" }} />
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={resetForm} style={btn()}>Cancel</button>
              <button onClick={saveExam} style={btn(true)} disabled={!date}>{editExam ? "Save Changes" : "Add Exam"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}