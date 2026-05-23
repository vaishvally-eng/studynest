import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, serverTimestamp, updateDoc, arrayUnion, arrayRemove, orderBy
} from "firebase/firestore";

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

  // ── Canvas (Shared Notes) ──────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<[number, number]>([0, 0]);
  const drawHistory = useRef<string[]>([]);
  const [drawTool, setDrawTool] = useState<"pen" | "marker" | "eraser">("pen");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(3);

  // Resize canvas when tab becomes active
  useEffect(() => {
    if (tab !== "syncnotes") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const saved = canvas.toDataURL();
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // Restore drawing after resize
      if (drawHistory.current.length > 0) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
        };
        img.src = saved;
      }
    };
    // Small delay so the DOM has laid out
    const t = setTimeout(resize, 50);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [tab]);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const saveDrawState = () => {
    const c = canvasRef.current;
    if (!c) return;
    drawHistory.current.push(c.toDataURL());
    if (drawHistory.current.length > 40) drawHistory.current.shift();
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    isDrawing.current = true;
    saveDrawState();
    const r = c.getBoundingClientRect();
    lastPos.current = [e.clientX - r.left, e.clientY - r.top];
    c.setPointerCapture(e.pointerId);
  };

  const doDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!ctx || !c) return;
    const r = c.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (drawTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 4;
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (drawTool === "marker") {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = brushSize * 3;
      ctx.strokeStyle = drawColor + "55";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = drawColor;
    }
    ctx.beginPath();
    ctx.moveTo(lastPos.current[0], lastPos.current[1]);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPos.current = [x, y];
  };

  const stopDraw = () => {
    isDrawing.current = false;
    const ctx = getCtx();
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  const undoDraw = () => {
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!c || !ctx) return;
    if (drawHistory.current.length === 0) return;
    const prev = drawHistory.current.pop();
    if (!prev) { ctx.clearRect(0, 0, c.width, c.height); return; }
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0); };
    img.src = prev;
  };

  const clearDraw = () => {
    saveDrawState();
    const c = canvasRef.current;
    const ctx = getCtx();
    if (ctx && c) ctx.clearRect(0, 0, c.width, c.height);
  };

  const saveDraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = "study-notes.png";
    a.href = c.toDataURL();
    a.click();
  };

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
    { id: "timer" as const,     label: "Timer",    icon: "⏱" },
    { id: "todo" as const,      label: "To-Do",    icon: "✅" },
    { id: "syncnotes" as const, label: "Canvas",   icon: "✏️" },
    { id: "library" as const,   label: "Library",  icon: "📚" },
  ];

  const DRAW_COLORS = ["#ffffff", "#f97b5c", "#6ee7b7", "#818cf8", "#fbbf24", "#f472b6", "#38bdf8"];

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
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
            <div style={{ background: "var(--bg-card)", borderRadius: 24, padding: 32, width: 380, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", fontFamily: "'Segoe UI',sans-serif" }}>
              <h3 style={{ margin: "0 0 20px", color: "var(--text-primary)" }}>🏫 Host a Room</h3>
              <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Room name…" autoFocus
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "0.9rem", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit" }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={newRoomPrivate} onChange={e => setNewRoomPrivate(e.target.checked)} />
                Private (join by code only)
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text-primary)", cursor: "pointer" }}>Cancel</button>
                <button onClick={createRoom} style={{ flex: 2, padding: "10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700, cursor: "pointer" }}>Create & Enter</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HUB
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f0c18", color: "white", fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes flipDown{0%{transform:rotateX(0)}100%{transform:rotateX(-90deg);opacity:0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
      `}</style>

      {/* ── Topbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 54, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>{activeRoom?.name}</span>
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>{activeRoom?.private ? "PRIVATE HUB" : "PUBLIC ROOM"}</span>
          <span style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.06)", borderRadius: 5, padding: "2px 7px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>#{activeRoom?.code}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "0.68rem", color: "#22c55e", fontWeight: 600 }}>{members.length} ONLINE</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Music bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: "5px 12px" }}>
            {VIBES.map(v => (
              <button key={v.id} onClick={() => setVibe(v)} title={v.label}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", opacity: vibe.id === v.id ? 1 : 0.28, transition: "opacity 0.15s", padding: "0 1px" }}>
                {v.emoji}
              </button>
            ))}
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)", margin: "0 3px" }} />
            <button onClick={() => setMusicOn(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", color: musicOn ? "#f97b5c" : "rgba(255,255,255,0.35)", fontSize: "0.78rem", fontWeight: 700, padding: 0 }}>
              {musicOn ? "♪ ON" : "♪ OFF"}
            </button>
            {musicOn && <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => setVolume(+e.target.value)} style={{ width: 50, accentColor: "#f97b5c" }} />}
          </div>

          <button onClick={() => {
            setScreen("lobby"); setActiveRoom(null); setRunning(false);
            audioRef.current?.pause(); setMusicOn(false);
          }} style={{ padding: "6px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.78rem" }}>↩ Leave</button>

          <button onClick={() => { navigator.clipboard.writeText(activeRoom?.code || ""); alert(`Code copied: ${activeRoom?.code}`); }}
            style={{ padding: "6px 16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}>
            + Invite Buddy
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar */}
        <div style={{ width: 188, borderRight: "1px solid rgba(255,255,255,0.07)", padding: "20px 14px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 20, background: "rgba(255,255,255,0.01)", overflowY: "auto" }}>
          <div>
            <p style={{ margin: "0 0 10px", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Your Presence</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["focused", "on", "idle"] as const).map(s => (
                <button key={s} onClick={() => setMyStatus(s)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: myStatus === s ? "white" : "rgba(255,255,255,0.25)", transition: "color 0.2s", padding: 0 }}>
                  <span style={{ fontSize: "1.1rem" }}>{s === "focused" ? "🎯" : s === "on" ? "☕" : "😴"}</span>
                  <span style={{ fontSize: "0.55rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 10px", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Co-Focusing</p>
            {members.length === 0
              ? <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.15)", fontStyle: "italic", margin: 0 }}>Energy in sync.</p>
              : members.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `hsl(${(m.charCodeAt(0) * 47) % 360},55%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>{m[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Center */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, padding: "12px 24px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 20px 10px", border: "none", cursor: "pointer", background: tab === t.id ? "rgba(249,123,92,0.12)" : "none", color: tab === t.id ? "#f97b5c" : "rgba(255,255,255,0.35)", borderRadius: "10px 10px 0 0", borderBottom: tab === t.id ? "2px solid #f97b5c" : "2px solid transparent", fontWeight: tab === t.id ? 700 : 400, fontSize: "0.8rem", letterSpacing: "0.05em", transition: "all 0.15s" }}>
                {t.icon} {t.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: tab === "syncnotes" ? "hidden" : "auto", padding: tab === "syncnotes" ? "16px 24px" : "32px 24px", display: "flex", flexDirection: "column" }}>

            {/* TIMER */}
            {tab === "timer" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
                <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  {timerPhase === "work" ? "● HUB IN STILLNESS" : "● BREAK TIME"}
                </p>

                {/* Flip clock */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6 }}><FlipDigit digit={mm[0]} prev={pmm[0]} /><FlipDigit digit={mm[1]} prev={pmm[1]} /></div>
                    <p style={{ margin: 0, fontSize: "0.56rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Minutes</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 18 }}>
                    {[0, 1].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: running ? "#f97b5c" : "rgba(255,255,255,0.12)", boxShadow: running ? "0 0 8px #f97b5c" : "none", transition: "all 0.3s" }} />)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6 }}><FlipDigit digit={ss2[0]} prev={pss[0]} /><FlipDigit digit={ss2[1]} prev={pss[1]} /></div>
                    <p style={{ margin: 0, fontSize: "0.56rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Seconds</p>
                  </div>
                </div>

                <div style={{ width: 300, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${progress * 100}%`, background: timerPhase === "work" ? "#f97b5c" : "#6ee7b7", borderRadius: 4, transition: "width 0.8s linear" }} />
                </div>

                <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                  PHASE {timerPhase === "work" ? 1 : 2} OF 2 ({timerPhase.toUpperCase()}) · {sessions} DONE
                </p>

                {isHost ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => { setRunning(false); const n = timerPhase === "work" ? workMins * 60 : breakMins * 60; setSecondsLeft(n); setPrevSecs(n); syncTimer(false, n, timerPhase); }}
                      style={{ padding: "8px 18px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "0.82rem" }}>↺ Reset</button>
                    <button onClick={() => { const r = !running; setRunning(r); syncTimer(r, secondsLeft, timerPhase); }}
                      style={{ padding: "12px 42px", borderRadius: 28, border: "none", background: running ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: running ? "none" : "0 6px 22px rgba(249,123,92,0.4)" }}>
                      {running ? "⏸ Pause" : "▶ Start"}
                    </button>
                    <button onClick={() => { setRunning(false); if (timerPhase === "work") { setTimerPhase("break"); const n = breakMins * 60; setSecondsLeft(n); setPrevSecs(n); syncTimer(false, n, "break"); } else { setTimerPhase("work"); const n = workMins * 60; setSecondsLeft(n); setPrevSecs(n); syncTimer(false, n, "work"); } }}
                      style={{ padding: "8px 18px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "0.82rem" }}>Skip →</button>
                  </div>
                ) : (
                  <div style={{ padding: "12px 32px", borderRadius: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", letterSpacing: "0.1em" }}>WAITING FOR HOST</div>
                )}

                {isHost && (
                  <div style={{ display: "flex", gap: 7 }}>
                    {[{w:25,b:5,l:"🍅 25/5"},{w:50,b:10,l:"🧠 50/10"},{w:15,b:3,l:"⚡ 15/3"}].map(p => (
                      <button key={p.l} onClick={() => { setWorkMins(p.w); setBreakMins(p.b); const n = p.w*60; setSecondsLeft(n); setPrevSecs(n); setTimerPhase("work"); setRunning(false); syncTimer(false,n,"work"); }}
                        style={{ padding: "5px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: "0.75rem" }}>
                        {p.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TODO */}
            {tab === "todo" && (
              <div style={{ maxWidth: 540, margin: "0 auto" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>Collaborative To-Do</h3>
                <p style={{ margin: "0 0 20px", fontSize: "0.78rem", color: "rgba(255,255,255,0.25)" }}>When everyone checks off an item → 🎉</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Add a shared task…"
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "white", outline: "none", fontSize: "0.87rem", fontFamily: "inherit" }} />
                  <button onClick={addTodo} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700, cursor: "pointer" }}>+</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {todos.map(todo => {
                    const done: string[] = todo.completed || [];
                    const myDone = done.includes(username);
                    const allDone = members.length > 0 && done.length >= members.length;
                    return (
                      <div key={todo.id} style={{ background: allDone ? "rgba(110,231,183,0.07)" : "rgba(255,255,255,0.04)", border: allDone ? "1px solid rgba(110,231,183,0.2)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 15px", display: "flex", alignItems: "center", gap: 11, transition: "all 0.3s", animation: "fadeUp 0.3s ease" }}>
                        <button onClick={() => toggleTodo(todo)} style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, border: myDone ? "none" : "2px solid rgba(255,255,255,0.18)", background: myDone ? "linear-gradient(135deg,#f97b5c,#f4a26a)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "white" }}>{myDone ? "✓" : ""}</button>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "0.87rem", color: allDone ? "#6ee7b7" : "rgba(255,255,255,0.82)", textDecoration: allDone ? "line-through" : "none" }}>{todo.text}</p>
                          <p style={{ margin: "3px 0 0", fontSize: "0.68rem", color: "rgba(255,255,255,0.2)" }}>{done.length}/{members.length || "?"} done · by {todo.createdBy}</p>
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {Array.from({ length: Math.max(members.length, done.length, 1) }).map((_, i) => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < done.length ? "#6ee7b7" : "rgba(255,255,255,0.1)" }} />
                          ))}
                        </div>
                        {allDone && <span>🎉</span>}
                        <button onClick={() => deleteDoc(doc(db, "studyrooms", activeRoom.id, "todos", todo.id))} style={{ background: "none", border: "none", color: "rgba(255,100,80,0.35)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>✕</button>
                      </div>
                    );
                  })}
                  {todos.length === 0 && <p style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.82rem", textAlign: "center", marginTop: 16 }}>No tasks yet!</p>}
                </div>
              </div>
            )}

            {/* ── CANVAS (Shared Notes) ── */}
            {tab === "syncnotes" && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>Shared Canvas</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.22)" }}>Draw, sketch, write — your shared whiteboard</p>
                  </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "12px 12px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", flexWrap: "wrap", flexShrink: 0 }}>
                  {(["pen", "marker", "eraser"] as const).map(t => (
                    <button key={t} onClick={() => setDrawTool(t)} style={{
                      padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: "0.74rem", transition: "all 0.15s",
                      border: `1px solid ${drawTool === t ? "#f97b5c" : "rgba(255,255,255,0.1)"}`,
                      background: drawTool === t ? "rgba(249,123,92,0.15)" : "none",
                      color: drawTool === t ? "#f97b5c" : "rgba(255,255,255,0.45)",
                    }}>
                      {t === "pen" ? "✏️ Pen" : t === "marker" ? "🖊 Marker" : "⬜ Eraser"}
                    </button>
                  ))}

                  <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

                  {DRAW_COLORS.map(c => (
                    <div key={c} onClick={() => setDrawColor(c)} style={{
                      width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer", flexShrink: 0, transition: "border 0.12s",
                      border: drawColor === c ? "2.5px solid white" : "2px solid rgba(255,255,255,0.1)",
                      boxShadow: drawColor === c ? `0 0 6px ${c}` : "none",
                    }} />
                  ))}

                  {/* Custom color picker */}
                  <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                    title="Custom colour"
                    style={{ width: 22, height: 22, border: "none", background: "none", cursor: "pointer", borderRadius: "50%", padding: 0, flexShrink: 0 }} />

                  <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>Size</span>
                  <input type="range" min={1} max={28} value={brushSize} onChange={e => setBrushSize(+e.target.value)}
                    style={{ width: 64, accentColor: "#f97b5c" }} />
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", minWidth: 18 }}>{brushSize}</span>

                  <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

                  <button onClick={undoDraw} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.74rem" }}>↩ Undo</button>
                  <button onClick={clearDraw} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.74rem" }}>🗑 Clear</button>
                  <button onClick={saveDraw} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.74rem" }}>⬇ Save PNG</button>
                </div>

                {/* Canvas */}
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDraw}
                  onPointerMove={doDraw}
                  onPointerUp={stopDraw}
                  onPointerLeave={stopDraw}
                  style={{
                    flex: 1,
                    width: "100%",
                    display: "block",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "0 0 16px 16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: drawTool === "eraser" ? "cell" : "crosshair",
                    touchAction: "none",
                  }}
                />
              </div>
            )}

            {/* LIBRARY */}
            {tab === "library" && (
              <div style={{ maxWidth: 620, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>Room Library</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.22)" }}>Share PDFs, notes, images with your room</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ padding: "8px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? "Uploading…" : "+ Upload"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.ppt,.pptx" onChange={uploadFile} style={{ display: "none" }} />
                </div>
                {libFiles.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.18)" }}>
                    <p style={{ fontSize: "2.2rem", margin: "0 0 8px" }}>📁</p>
                    <p style={{ fontSize: "0.82rem" }}>No files yet — upload PDFs, notes, or images</p>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {libFiles.map(f => {
                    const isImg = f.type?.startsWith("image/");
                    const icon = isImg ? "🖼️" : f.type === "application/pdf" ? "📄" : "📎";
                    return (
                      <div key={f.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, animation: "fadeUp 0.3s ease" }}>
                        <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.78)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                          <p style={{ margin: "3px 0 0", fontSize: "0.68rem", color: "rgba(255,255,255,0.22)" }}>{f.size ? `${(f.size / 1024).toFixed(0)} KB · ` : ""}by {f.uploadedBy}</p>
                        </div>
                        {isImg && f.data && <img src={f.data} alt={f.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 7, flexShrink: 0 }} />}
                        {f.data
                          ? <a href={f.data} download={f.name} style={{ padding: "5px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", fontSize: "0.74rem", textDecoration: "none" }}>Download</a>
                          : <span style={{ fontSize: "0.68rem", color: "rgba(255,100,80,0.45)" }}>Too large to store</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        <div style={{ width: 270, borderLeft: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.01)" }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>💬 Hub Chat</span>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", marginLeft: "auto" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
            {chatMessages.length === 0 && <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.78rem", textAlign: "center", marginTop: 16, fontStyle: "italic" }}>Say hello 👋</p>}
            {chatMessages.map((msg, i) => {
              const isMe = msg.from === username;
              return (
                <div key={msg.id || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", animation: "fadeUp 0.2s ease" }}>
                  {!isMe && <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.22)", marginBottom: 2, marginLeft: 2 }}>{msg.from}</span>}
                  <div style={{ maxWidth: "84%", padding: "8px 11px", borderRadius: isMe ? "13px 13px 3px 13px" : "13px 13px 13px 3px", background: isMe ? "linear-gradient(135deg,#f97b5c,#f4a26a)" : "rgba(255,255,255,0.07)", fontSize: "0.81rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
          <div style={{ padding: "9px 10px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 7 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Share a thought…"
              style={{ flex: 1, padding: "8px 11px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "0.8rem", fontFamily: "inherit", outline: "none" }} />
            <button onClick={sendChat} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#f97b5c,#f4a26a)", color: "white", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}