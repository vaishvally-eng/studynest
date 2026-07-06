import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, serverTimestamp, updateDoc, arrayUnion, arrayRemove, orderBy
} from "firebase/firestore";
import Whiteboard from "./Whiteboard";

// ─── VIBES (royalty-free audio) ───────────────────────────────────────────────
const VIBES = [
  { id: "rain",      label: "Rain",      emoji: "🌧️", color: "#7eb8d4",
    audio: "https://cdn.pixabay.com/audio/2022/03/10/audio_1a609e8e94.mp3",
    gradient: "linear-gradient(135deg,#0e1a2b,#2a5a8a)" },
  { id: "forest",    label: "Forest",    emoji: "🌲", color: "#52b788",
    audio: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    gradient: "linear-gradient(135deg,#0a1f14,#2d7a4f)" },
  { id: "fireplace", label: "Fireplace", emoji: "🔥", color: "#e8783a",
    audio: "https://cdn.pixabay.com/audio/2022/10/16/audio_c8c8a73467.mp3",
    gradient: "linear-gradient(135deg,#120500,#8a2f00)" },
  { id: "ocean",     label: "Ocean",     emoji: "🌊", color: "#38bdf8",
    audio: "https://cdn.pixabay.com/audio/2022/04/08/audio_2fb24e5a09.mp3",
    gradient: "linear-gradient(135deg,#040d1a,#0c6a9e)" },
  { id: "cafe",      label: "Café",      emoji: "☕", color: "#c48b5a",
    audio: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3",
    gradient: "linear-gradient(135deg,#140a02,#7a4018)" },
  { id: "lofi",      label: "Lo-Fi",     emoji: "🎵", color: "#c084fc",
    audio: "https://cdn.pixabay.com/audio/2023/02/28/audio_6c3e9c1b1e.mp3",
    gradient: "linear-gradient(135deg,#0f0516,#4a1060)" },
  { id: "space",     label: "Space",     emoji: "🌌", color: "#818cf8",
    audio: "https://cdn.pixabay.com/audio/2022/06/07/audio_b52040d94b.mp3",
    gradient: "linear-gradient(135deg,#02000a,#120040)" },
  { id: "library",   label: "Library",   emoji: "📚", color: "#a8895a",
    audio: "https://cdn.pixabay.com/audio/2022/07/25/audio_124bdf8dcc.mp3",
    gradient: "linear-gradient(135deg,#0d0904,#4a3415)" },
];

// ─── FLIP DIGIT ───────────────────────────────────────────────────────────────
function FlipDigit({ digit, prev }: { digit: string; prev: string }) {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (digit !== prev) { setFlip(true); setTimeout(() => setFlip(false), 380); }
  }, [digit]);
  return (
    <div style={{ width: 68, height: 88, position: "relative", perspective: 500 }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(20,14,30,0.85)", backdropFilter: "blur(8px)",
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "3.2rem", fontWeight: 900, color: "white",
        boxShadow: "0 6px 24px rgba(0,0,0,0.5)", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.5)" }} />
        {digit}
      </div>
      {flip && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "rgba(10,5,20,0.92)", borderRadius: "12px 12px 0 0",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          overflow: "hidden", transformOrigin: "bottom center", zIndex: 5,
          animation: "flipDown 0.38s ease-in forwards",
          fontSize: "3.2rem", fontWeight: 900, color: "rgba(255,255,255,0.6)",
        }}>
          <span style={{ transform: "translateY(50%)" }}>{prev}</span>
        </div>
      )}
    </div>
  );
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StudyRoom() {
  const { user } = useAuth() as any;
  const username: string = user?.displayName || user?.email?.split("@")[0] || "You";

  const [screen, setScreen] = useState<"lobby" | "hub">("lobby");
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);

  // Lobby
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState(["", "", "", "", "", ""]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);

  // Hub tab
  const [tab, setTab] = useState<"timer" | "todo" | "syncnotes" | "library">("timer");

  // Timer
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [prevSecs, setPrevSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState<"work" | "break">("work");
  const [sessions, setSessions] = useState(0);
  const timerRef = useRef<any>(null);

  // Music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [vibe, setVibe] = useState(VIBES[0]);
  const [musicOn, setMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.3);

  // Collab data
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [libFiles, setLibFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [myStatus, setMyStatus] = useState<"focused" | "on" | "idle">("focused");

  // ── Load public rooms ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "studyrooms"), where("private", "==", false));
    return onSnapshot(q, snap =>
      setAllRooms(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // ── Room realtime subscriptions ────────────────────────────────────────────
  useEffect(() => {
    if (!activeRoom) return;
    const roomRef = doc(db, "studyrooms", activeRoom.id);

    const unsubRoom = onSnapshot(roomRef, snap => {
      const data = snap.data();
      if (!data) return;
      setMembers(data.members || []);
      if (!isHost) {
        if (data.timerRunning !== undefined) setRunning(data.timerRunning);
        if (data.secondsLeft !== undefined) { setSecondsLeft(data.secondsLeft); setPrevSecs(data.secondsLeft); }
        if (data.timerPhase) setTimerPhase(data.timerPhase);
      }
    });

    const unsubTodos = onSnapshot(
      query(collection(db, "studyrooms", activeRoom.id, "todos"), orderBy("createdAt")),
      snap => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubLib = onSnapshot(
      query(collection(db, "studyrooms", activeRoom.id, "library"), orderBy("uploadedAt", "desc")),
      snap => setLibFiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubChat = onSnapshot(
      query(collection(db, "studyrooms", activeRoom.id, "chat"), orderBy("sentAt")),
      snap => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    updateDoc(roomRef, { members: arrayUnion(username) }).catch(() => {});

    return () => {
      unsubRoom(); unsubTodos(); unsubLib(); unsubChat();
      updateDoc(roomRef, { members: arrayRemove(username) }).catch(() => {});
    };
  }, [activeRoom]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(s => {
          setPrevSecs(s);
          if (s <= 1) {
            clearInterval(timerRef.current);
            setRunning(false);
            if (timerPhase === "work") {
              setSessions(n => n + 1);
              setTimerPhase("break");
              const n = breakMins * 60;
              if (activeRoom && isHost) syncTimer(false, n, "break");
              return n;
            } else {
              setTimerPhase("work");
              const n = workMins * 60;
              if (activeRoom && isHost) syncTimer(false, n, "work");
              return n;
            }
          }
          if (activeRoom && isHost && s % 10 === 0) syncTimer(true, s - 1, timerPhase);
          return s - 1;
        });
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [running, timerPhase, workMins, breakMins]);

  const syncTimer = (run: boolean, secs: number, phase: string) => {
    if (!activeRoom) return;
    updateDoc(doc(db, "studyrooms", activeRoom.id), { timerRunning: run, secondsLeft: secs, timerPhase: phase }).catch(() => {});
  };

  // ── Music ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!musicOn) { audioRef.current?.pause(); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    const a = new Audio(vibe.audio);
    a.loop = true; a.volume = volume;
    a.play().catch(() => {});
    audioRef.current = a;
    return () => a.pause();
  }, [musicOn, vibe]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  // ── Create room ────────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!newRoomName.trim() || !user) return;
    const code = genCode();
    const ref2 = await addDoc(collection(db, "studyrooms"), {
      name: newRoomName.trim(), code,
      private: newRoomPrivate, hostUid: user.uid, hostName: username,
      members: [username], createdAt: serverTimestamp(),
      timerRunning: false, secondsLeft: 25 * 60, timerPhase: "work",
    });
    const room = { id: ref2.id, name: newRoomName.trim(), code, private: newRoomPrivate, hostUid: user.uid };
    setActiveRoom(room); setIsHost(true);
    setShowCreate(false); setNewRoomName(""); setScreen("hub");
  };

  // ── Join by code ───────────────────────────────────────────────────────────
  const joinByCode = async () => {
    const code = joinCode.join("").toUpperCase();
    if (code.length < 6) return;
    const rooms2 = await new Promise<any[]>(resolve => {
      const unsub = onSnapshot(query(collection(db, "studyrooms"), where("code", "==", code)), s => {
        unsub(); resolve(s.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    });
    if (rooms2.length === 0) { alert("Room not found!"); return; }
    const room = rooms2[0];
    setActiveRoom(room); setIsHost(room.hostUid === user?.uid); setScreen("hub");
  };

  const joinRoom = (room: any) => {
    setActiveRoom(room); setIsHost(room.hostUid === user?.uid); setScreen("hub");
  };

  // ── Todo ───────────────────────────────────────────────────────────────────
  const addTodo = async () => {
    if (!newTodo.trim() || !activeRoom) return;
    await addDoc(collection(db, "studyrooms", activeRoom.id, "todos"), {
      text: newTodo.trim(), completed: [], createdAt: serverTimestamp(), createdBy: username,
    });
    setNewTodo("");
  };

  const toggleTodo = async (todo: any) => {
    const ref2 = doc(db, "studyrooms", activeRoom.id, "todos", todo.id);
    const done: string[] = todo.completed || [];
    if (done.includes(username)) await updateDoc(ref2, { completed: arrayRemove(username) });
    else await updateDoc(ref2, { completed: arrayUnion(username) });
  };

  // ── Library upload (base64, <900KB) ───────────────────────────────────────
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await addDoc(collection(db, "studyrooms", activeRoom.id, "library"), {
        name: file.name, type: file.type, size: file.size,
        data: base64.length < 900000 ? base64 : null,
        uploadedBy: username, uploadedAt: serverTimestamp(),
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || !activeRoom) return;
    await addDoc(collection(db, "studyrooms", activeRoom.id, "chat"), {
      text: chatInput.trim(), from: username, sentAt: serverTimestamp(),
    });
    setChatInput("");
  };

  // ── Display helpers ────────────────────────────────────────────────────────
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss2 = String(secondsLeft % 60).padStart(2, "0");
  const pmm = String(Math.floor(prevSecs / 60)).padStart(2, "0");
  const pss = String(prevSecs % 60).padStart(2, "0");
  const totalSecs = timerPhase === "work" ? workMins * 60 : breakMins * 60;
  const progress = 1 - secondsLeft / totalSecs;

  const TABS = [
    { id: "timer" as const,     label: "Timer",   icon: "⏱" },
    { id: "todo" as const,      label: "To-Do",   icon: "✅" },
    { id: "syncnotes" as const, label: "Canvas",  icon: "✏️" },
    { id: "library" as const,   label: "Library", icon: "📚" },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === "lobby") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "'Georgia','Palatino',serif", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(249,123,92,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(192,132,252,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

        <style>{`
          @keyframes flipDown{0%{transform:rotateX(0)}100%{transform:rotateX(-90deg);opacity:0}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
          .room-card:hover{transform:translateY(-4px)!important;box-shadow:0 16px 40px rgba(249,123,92,0.15)!important}
        `}</style>

        {/* Header */}
        <div style={{ padding: "36px 48px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <h1 style={{ margin: 0, fontSize: "2.8rem", color: "var(--text-primary)", fontWeight: 400, lineHeight: 1.1 }}>
              Study <em style={{ fontStyle: "italic", fontWeight: 700 }}>Rooms</em>
            </h1>
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontFamily: "'Segoe UI',sans-serif", fontSize: "0.92rem", fontStyle: "italic" }}>
              Studying is better together. Join the collective energy.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            padding: "12px 24px", borderRadius: 28, border: "none",
            background: "linear-gradient(135deg,#f97b5c,#f4a26a)",
            color: "white", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
            letterSpacing: "0.05em", boxShadow: "0 4px 16px rgba(249,123,92,0.35)",
            fontFamily: "'Segoe UI',sans-serif", animation: "fadeUp 0.5s 0.1s ease both",
          }}>+ HOST ROOM</button>
        </div>

        {/* Grid */}
        <div style={{ padding: "32px 48px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>

          {/* Join card */}
          <div style={{ background: "var(--bg-card)", borderRadius: 24, border: "1px solid var(--border)", padding: "28px 22px", boxShadow: "var(--shadow-card)", animation: "fadeUp 0.5s 0.15s ease both" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: "1.2rem", color: "var(--text-primary)", fontWeight: 400 }}>Join with Code</h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {joinCode.map((c, i) => (
                <input key={i} id={`jc-${i}`} value={c} maxLength={1}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    const next = [...joinCode]; next[i] = val; setJoinCode(next);
                    if (val && i < 5) (document.getElementById(`jc-${i + 1}`) as HTMLInputElement)?.focus();
                  }}
                  onKeyDown={e => { if (e.key === "Backspace" && !joinCode[i] && i > 0) (document.getElementById(`jc-${i - 1}`) as HTMLInputElement)?.focus(); }}
                  style={{ width: 36, height: 48, textAlign: "center", fontSize: "1rem", fontWeight: 700, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontFamily: "monospace" }}
                  onFocus={e => e.target.style.borderColor = "#f97b5c"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              ))}
            </div>
            <button onClick={joinByCode} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'Segoe UI',sans-serif", marginBottom: 20 }}>JUMP IN</button>

            {/* Music picker */}
            <div style={{ paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Segoe UI',sans-serif" }}>Ambient music</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                {VIBES.map(v => (
                  <button key={v.id} onClick={() => setVibe(v)} title={v.label}
                    style={{ background: vibe.id === v.id ? v.gradient : "var(--bg-secondary)", border: vibe.id === v.id ? `1px solid ${v.color}` : "1px solid var(--border)", borderRadius: 9, padding: "4px 7px", cursor: "pointer", fontSize: "0.95rem", transition: "all 0.15s", opacity: vibe.id === v.id ? 1 : 0.55 }}>
                    {v.emoji}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setMusicOn(m => !m)} style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid var(--border)", background: musicOn ? "var(--accent-soft)" : "var(--bg-secondary)", color: musicOn ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, fontFamily: "'Segoe UI',sans-serif" }}>
                  {musicOn ? `♪ ${vibe.label}` : "♪ Off"}
                </button>
                {musicOn && <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => setVolume(+e.target.value)} style={{ flex: 1, accentColor: vibe.color }} />}
              </div>
            </div>
          </div>

          {/* Room list */}
          <div style={{ animation: "fadeUp 0.5s 0.2s ease both" }}>
            {allRooms.length === 0 && (
              <div style={{ background: "var(--bg-card)", borderRadius: 24, border: "1px solid var(--border)", padding: 48, textAlign: "center", color: "var(--text-muted)", fontFamily: "'Segoe UI',sans-serif" }}>
                <p style={{ fontSize: "2.5rem", margin: "0 0 10px" }}>🏫</p>
                <p>No public rooms yet — host one and invite your study buddies!</p>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
              {allRooms.map(room => (
                <div key={room.id} className="room-card" style={{ background: "var(--bg-card)", borderRadius: 22, border: "1px solid var(--border)", padding: "22px", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "all 0.22s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-primary)", fontWeight: 600, fontFamily: "'Segoe UI',sans-serif" }}>{room.name}</h3>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "monospace", background: "var(--bg-secondary)", padding: "2px 7px", borderRadius: 5 }}>{room.code}</span>
                  </div>
                  <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "'Segoe UI',sans-serif" }}>{(room.members?.length || 0)} participating</p>
                  <button onClick={() => joinRoom(room)} style={{ background: "none", border: "none", color: "#f97b5c", cursor: "pointer", fontWeight: 700, fontSize: "0.86rem", fontFamily: "'Segoe UI',sans-serif", padding: 0 }}>Jump In →</button>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Create modal */}
        {showCreate && (
          <div
            onClick={() => setShowCreate(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(20,10,30,0.55)",
              backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
              justifyContent: "center", zIndex: 100,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--bg-card)", borderRadius: 24, padding: "32px 28px",
                width: 360, boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
                border: "1px solid var(--border)", fontFamily: "'Segoe UI',sans-serif",
              }}
            >
              <h3 style={{ margin: "0 0 18px", fontSize: "1.3rem", color: "var(--text-primary)", fontWeight: 700 }}>
                Host a Study Room
              </h3>
              <input
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)",
                  background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.95rem",
                  outline: "none", marginBottom: 16, boxSizing: "border-box",
                }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newRoomPrivate}
                  onChange={e => setNewRoomPrivate(e.target.checked)}
                />
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Private (join by code only)
                </span>
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)",
                    background: "var(--bg-secondary)", color: "var(--text-secondary)", fontWeight: 600,
                    cursor: "pointer", fontSize: "0.88rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createRoom}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 14, border: "none",
                    background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700,
                    cursor: "pointer", fontSize: "0.88rem", letterSpacing: "0.03em",
                  }}
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HUB (inside a room)
  // ═══════════════════════════════════════════════════════════════════════════
  const leaveRoom = () => {
    setScreen("lobby");
    setActiveRoom(null);
    setIsHost(false);
    setTab("timer");
  };

  const toggleTimer = () => {
    const next = !running;
    setRunning(next);
    if (activeRoom && isHost) syncTimer(next, secondsLeft, timerPhase);
  };

  const resetTimer = () => {
    setRunning(false);
    const n = timerPhase === "work" ? workMins * 60 : breakMins * 60;
    setSecondsLeft(n);
    setPrevSecs(n);
    if (activeRoom && isHost) syncTimer(false, n, timerPhase);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)", borderRadius: 22, border: "1px solid var(--border)",
    boxShadow: "var(--shadow-card)", padding: 24,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg-primary)", fontFamily: "'Segoe UI',sans-serif" }}>
      {/* Main panel */}
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {/* Room header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", color: "var(--text-primary)", fontFamily: "'Georgia','Palatino',serif" }}>
              {activeRoom?.name}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Code: <span style={{ fontFamily: "monospace" }}>{activeRoom?.code}</span> · {members.length} here · {isHost ? "You're hosting" : "Guest"}
            </p>
          </div>
          <button
            onClick={leaveRoom}
            style={{
              padding: "10px 20px", borderRadius: 20, border: "1px solid var(--border)",
              background: "var(--bg-secondary)", color: "var(--text-secondary)", fontWeight: 600,
              cursor: "pointer", fontSize: "0.82rem",
            }}
          >
            ← Leave Room
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border-light)", paddingBottom: 12 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 18px", borderRadius: 18, border: "none", cursor: "pointer",
                background: tab === t.id ? "linear-gradient(135deg,#f97b5c,#f4a26a)" : "var(--bg-secondary)",
                color: tab === t.id ? "white" : "var(--text-secondary)", fontWeight: 600, fontSize: "0.85rem",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Timer tab */}
        {tab === "timer" && (
          <div style={cardStyle}>
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 20px" }}>
              {timerPhase === "work" ? "Focus Session" : "Break Time"} · Session {sessions + 1}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
              <FlipDigit digit={mm[0]} prev={pmm[0]} />
              <FlipDigit digit={mm[1]} prev={pmm[1]} />
              <div style={{ display: "flex", alignItems: "center", fontSize: "2rem", color: "var(--text-primary)", fontWeight: 900 }}>:</div>
              <FlipDigit digit={ss2[0]} prev={pss[0]} />
              <FlipDigit digit={ss2[1]} prev={pss[1]} />
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--bg-secondary)", overflow: "hidden", marginBottom: 24 }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg,#f97b5c,#f4a26a)", transition: "width 1s linear" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={toggleTimer}
                disabled={!isHost && !!activeRoom}
                style={{
                  padding: "12px 32px", borderRadius: 20, border: "none",
                  background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700,
                  cursor: isHost || !activeRoom ? "pointer" : "not-allowed", fontSize: "0.9rem",
                  opacity: isHost || !activeRoom ? 1 : 0.5,
                }}
              >
                {running ? "Pause" : "Start"}
              </button>
              <button
                onClick={resetTimer}
                disabled={!isHost && !!activeRoom}
                style={{
                  padding: "12px 24px", borderRadius: 20, border: "1px solid var(--border)",
                  background: "var(--bg-secondary)", color: "var(--text-secondary)", fontWeight: 600,
                  cursor: isHost || !activeRoom ? "pointer" : "not-allowed", fontSize: "0.9rem",
                  opacity: isHost || !activeRoom ? 1 : 0.5,
                }}
              >
                Reset
              </button>
            </div>
            {isHost && (
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <label>
                  Work (min){" "}
                  <input
                    type="number" min={1} value={workMins}
                    onChange={e => setWorkMins(Math.max(1, +e.target.value))}
                    style={{ width: 50, padding: 4, borderRadius: 8, border: "1px solid var(--border)", marginLeft: 6 }}
                  />
                </label>
                <label>
                  Break (min){" "}
                  <input
                    type="number" min={1} value={breakMins}
                    onChange={e => setBreakMins(Math.max(1, +e.target.value))}
                    style={{ width: 50, padding: 4, borderRadius: 8, border: "1px solid var(--border)", marginLeft: 6 }}
                  />
                </label>
              </div>
            )}

            {/* Music controls */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, justifyContent: "center" }}>
                {VIBES.map(v => (
                  <button
                    key={v.id} onClick={() => setVibe(v)} title={v.label}
                    style={{
                      background: vibe.id === v.id ? v.gradient : "var(--bg-secondary)",
                      border: vibe.id === v.id ? `1px solid ${v.color}` : "1px solid var(--border)",
                      borderRadius: 9, padding: "5px 9px", cursor: "pointer", fontSize: "1rem",
                      opacity: vibe.id === v.id ? 1 : 0.55,
                    }}
                  >
                    {v.emoji}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                <button
                  onClick={() => setMusicOn(m => !m)}
                  style={{
                    padding: "6px 14px", borderRadius: 10, border: "1px solid var(--border)",
                    background: musicOn ? "var(--accent-soft)" : "var(--bg-secondary)",
                    color: musicOn ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer",
                    fontSize: "0.78rem", fontWeight: 600,
                  }}
                >
                  {musicOn ? `♪ ${vibe.label}` : "♪ Off"}
                </button>
                {musicOn && (
                  <input
                    type="range" min={0} max={1} step={0.05} value={volume}
                    onChange={e => setVolume(+e.target.value)}
                    style={{ width: 120, accentColor: vibe.color }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* To-Do tab */}
        {tab === "todo" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                placeholder="Add a shared task..."
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 14, border: "1px solid var(--border)",
                  background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none",
                }}
              />
              <button
                onClick={addTodo}
                style={{
                  padding: "10px 20px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white",
                  fontWeight: 700, cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
            {todos.length === 0 && (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
                No tasks yet — add something the group needs to get done.
              </p>
            )}
            {todos.map(todo => {
              const done: string[] = todo.completed || [];
              const mine = done.includes(username);
              return (
                <div
                  key={todo.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 4px",
                    borderBottom: "1px solid var(--border-light)",
                  }}
                >
                  <input type="checkbox" checked={mine} onChange={() => toggleTodo(todo)} />
                  <span
                    style={{
                      flex: 1, color: "var(--text-primary)",
                      textDecoration: mine ? "line-through" : "none",
                      opacity: mine ? 0.5 : 1,
                    }}
                  >
                    {todo.text}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {done.length} done
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Canvas tab */}
        {tab === "syncnotes" && activeRoom && (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <Whiteboard roomId={activeRoom.id} />
          </div>
        )}

        {/* Library tab */}
        {tab === "library" && (
          <div style={cardStyle}>
            <input
              ref={fileInputRef}
              type="file"
              onChange={uploadFile}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "10px 20px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white",
                fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", marginBottom: 18,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading..." : "+ Upload File"}
            </button>
            {libFiles.length === 0 && (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
                No files shared yet.
              </p>
            )}
            {libFiles.map(f => (
              <div
                key={f.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 4px", borderBottom: "1px solid var(--border-light)",
                }}
              >
                <div>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "0.88rem" }}>{f.name}</p>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.72rem" }}>
                    {(f.size / 1024).toFixed(0)} KB · shared by {f.uploadedBy}
                  </p>
                </div>
                {f.data && (
                  <a
                    href={f.data}
                    download={f.name}
                    style={{ color: "#f97b5c", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat side panel */}
      <div
        style={{
          width: 300, borderLeft: "1px solid var(--border)", background: "var(--bg-card)",
          display: "flex", flexDirection: "column", padding: "24px 18px",
        }}
      >
        <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "var(--text-primary)" }}>Room Chat</h3>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
          {chatMessages.map(m => (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>{m.from}</p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)" }}>{m.text}</p>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
            placeholder="Message..."
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 12, border: "1px solid var(--border)",
              background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "0.85rem",
            }}
          />
          <button
            onClick={sendChat}
            style={{
              padding: "8px 14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", cursor: "pointer",
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
