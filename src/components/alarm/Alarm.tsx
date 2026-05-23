import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";

interface Alarm {
  id: string;
  label: string;
  time: string;
  days: number[];
  enabled: boolean;
  uid: string;
  createdAt: number;
  lastFired?: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Alarm() {
  const { user } = useAuth();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("07:00");
  const [days, setDays] = useState<number[]>([]);
  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alarms"), where("uid", "==", user.uid));
    return onSnapshot(q, snap => setAlarms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alarm))));
  }, [user]);

  // Check alarms every 10 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const nowTime = now.toTimeString().slice(0, 5);
      const nowDay = now.getDay();
      const todayStr = now.toISOString().split("T")[0];
      alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        if (alarm.lastFired === `${todayStr}-${nowTime}`) return;
        const dayMatch = alarm.days.length === 0 || alarm.days.includes(nowDay);
        if (alarm.time === nowTime && dayMatch) {
          setFiringAlarm(alarm);
          playAlarm();
          updateDoc(doc(db, "alarms", alarm.id), { lastFired: `${todayStr}-${nowTime}` });
        }
      });
    };
    const interval = setInterval(check, 10000);
    check();
    return () => clearInterval(interval);
  }, [alarms]);

  const playAlarm = () => {
    try {
      audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      let count = 0;
      alarmIntervalRef.current = setInterval(() => {
        if (count >= 20) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = count % 2 === 0 ? 1000 : 800;
        osc.type = "square";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        count++;
      }, 400);
    } catch {}
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    try { audioRef.current?.close(); } catch {}
    setFiringAlarm(null);
  };

  const saveAlarm = async () => {
    if (!time || !user) return;
    await addDoc(collection(db, "alarms"), {
      label: label.trim() || "Alarm", time, days, enabled: true,
      uid: user.uid, createdAt: Date.now()
    });
    setLabel(""); setTime("07:00"); setDays([]); setShowForm(false);
  };

  const toggleAlarm = async (alarm: Alarm) => {
    await updateDoc(doc(db, "alarms", alarm.id), { enabled: !alarm.enabled });
  };

  const deleteAlarm = async (id: string) => {
    await deleteDoc(doc(db, "alarms", id));
  };

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const currentDate = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "white", padding: "10px 14px", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box" as const
  };
  const btn = (active = false) => ({
    padding: "9px 22px", borderRadius: "10px", border: "none", fontSize: "0.85rem",
    fontWeight: 600 as const, cursor: "pointer",
    background: active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: "white"
  });

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI', sans-serif", padding: "32px" }}>

      {/* Firing alarm popup */}
      {firingAlarm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "linear-gradient(135deg,#1a1a2e,#2d1b69)", border: "2px solid #7c3aed", borderRadius: 28, padding: "48px 60px", textAlign: "center", maxWidth: 380 }}>
            <div style={{ fontSize: "4rem", marginBottom: 8 }}>⏰</div>
            <p style={{ margin: "0 0 4px", fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{firingAlarm.time}</p>
            <p style={{ margin: "0 0 24px", fontSize: "1.1rem", color: "#a78bfa" }}>{firingAlarm.label}</p>
            <button onClick={stopAlarm} style={{ ...btn(true), padding: "14px 48px", fontSize: "1.05rem" }}>
              Stop ✓
            </button>
          </div>
        </div>
      )}

      {/* Clock display */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <p style={{ margin: 0, fontSize: "4.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "white" }}>{currentTime}</p>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "1rem" }}>{currentDate}</p>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem" }}>⏰ Alarms</h2>
        <button onClick={() => setShowForm(true)} style={btn(true)}>+ Add Alarm</button>
      </div>

      {/* Alarm list */}
      {alarms.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 60, color: "rgba(255,255,255,0.2)" }}>
          <p style={{ fontSize: "3rem" }}>⏰</p>
          <p>No alarms yet — add one!</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[...alarms].sort((a, b) => a.time.localeCompare(b.time)).map(alarm => (
          <div key={alarm.id} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: alarm.enabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${alarm.enabled ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 16, padding: "18px 22px", transition: "all 0.2s"
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontSize: "2rem", fontWeight: 700, color: alarm.enabled ? "white" : "rgba(255,255,255,0.3)", letterSpacing: "-0.02em" }}>
                {alarm.time}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: "0.9rem", color: alarm.enabled ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>
                {alarm.label}
              </p>
              <div style={{ display: "flex", gap: 4 }}>
                {DAY_NAMES.map((d, i) => (
                  <span key={i} style={{
                    fontSize: "0.7rem", padding: "2px 7px", borderRadius: 20,
                    background: alarm.days.includes(i) ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                    color: alarm.days.includes(i) ? "#a78bfa" : "rgba(255,255,255,0.25)"
                  }}>{d}</span>
                ))}
                {alarm.days.length === 0 && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Once</span>}
              </div>
            </div>

            {/* Toggle switch */}
            <div onClick={() => toggleAlarm(alarm)} style={{
              width: 52, height: 28, borderRadius: 14, cursor: "pointer", position: "relative",
              background: alarm.enabled ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.1)",
              transition: "all 0.25s", flexShrink: 0
            }}>
              <div style={{
                position: "absolute", top: 3, left: alarm.enabled ? 26 : 3,
                width: 22, height: 22, borderRadius: "50%", background: "white",
                transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
              }} />
            </div>

            <button onClick={() => deleteAlarm(alarm.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "1.1rem" }}>🗑️</button>
          </div>
        ))}
      </div>

      {/* Add alarm form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "1.1rem" }}>⏰ New Alarm</h3>

            <label style={{ display: "block", marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Time *</p>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark", fontSize: "1.4rem", padding: "12px 16px" }} />
            </label>

            <label style={{ display: "block", marginBottom: 16 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Label</p>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Wake up, Study time..." style={inputStyle} />
            </label>

            <div style={{ marginBottom: 22 }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Repeat on days (leave empty for once)</p>
              <div style={{ display: "flex", gap: 8 }}>
                {DAY_NAMES.map((d, i) => (
                  <div key={i} onClick={() => toggleDay(i)} style={{
                    width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                    background: days.includes(i) ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
                    color: days.includes(i) ? "white" : "rgba(255,255,255,0.5)",
                    border: days.includes(i) ? "none" : "1px solid rgba(255,255,255,0.1)"
                  }}>{d}</div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={btn()}>Cancel</button>
              <button onClick={saveAlarm} style={btn(true)}>Save Alarm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}