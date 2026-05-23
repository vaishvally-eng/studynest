import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface Note {
  id: string;
  title: string;
  body?: string;
  uid: string;
  type: "typed" | "handwritten" | "pdf";
  canvasData?: string;
  pdfName?: string;
  updatedAt?: number;
}

type Tool = "pen" | "highlighter" | "eraser" | "shapes" | "text" | "lasso" | "ruler";
type Shape = "line" | "rect" | "circle";
type Background = "blank" | "lined" | "grid" | "dotted";

const PRESET_COLORS = ["#ffffff", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa", "#f87171", "#000000"];

function DrawingCanvas({ backgroundImage, tool, color, brushSize, shape }: {
  backgroundImage?: string;
  tool: Tool; color: string; brushSize: number; shape: Shape;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); initialized.current = true; };
      img.src = backgroundImage;
    }
  }, [backgroundImage]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: ((e as React.MouseEvent).clientX - rect.left) * sx, y: ((e as React.MouseEvent).clientY - rect.top) * sy };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
    startPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    if (["pen", "highlighter", "eraser"].includes(tool)) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = 20; }
      else if (tool === "highlighter") { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.3; ctx.lineWidth = 18; ctx.strokeStyle = color; }
      else { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.lineWidth = brushSize; ctx.strokeStyle = color; }
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      lastPos.current = pos;
    }

    if (tool === "shapes" || tool === "ruler") {
      const ov = overlayRef.current!; const octx = ov.getContext("2d")!;
      octx.clearRect(0, 0, ov.width, ov.height);
      octx.strokeStyle = color; octx.lineWidth = brushSize; octx.lineCap = "round";
      const [sx, sy] = [startPos.current!.x, startPos.current!.y];
      if (tool === "ruler" || shape === "line") { octx.beginPath(); octx.moveTo(sx, sy); octx.lineTo(pos.x, pos.y); octx.stroke(); }
      else if (shape === "rect") octx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      else { const rx = Math.abs(pos.x - sx) / 2, ry = Math.abs(pos.y - sy) / 2; octx.beginPath(); octx.ellipse(sx + (pos.x - sx) / 2, sy + (pos.y - sy) / 2, rx, ry, 0, 0, Math.PI * 2); octx.stroke(); }
    }
  };

  const stopDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    setDrawing(false);
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    if (tool === "shapes" || tool === "ruler") {
      overlayRef.current!.getContext("2d")!.clearRect(0, 0, 1200, 1600);
      ctx.strokeStyle = color; ctx.lineWidth = brushSize; ctx.lineCap = "round";
      const [sx, sy] = [startPos.current!.x, startPos.current!.y];
      if (tool === "ruler" || shape === "line") { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
      else if (shape === "rect") ctx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      else { const rx = Math.abs(pos.x - sx) / 2, ry = Math.abs(pos.y - sy) / 2; ctx.beginPath(); ctx.ellipse(sx + (pos.x - sx) / 2, sy + (pos.y - sy) / 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    lastPos.current = null;
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "12px" }}>
      <canvas ref={canvasRef} width={1200} height={1600}
        style={{ width: "100%", display: "block", borderRadius: "8px", cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <canvas ref={overlayRef} width={1200} height={1600}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: "8px" }}
      />
    </div>
  );
}

export default function Notes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<"list" | "typed" | "handwritten" | "pdf">("list");
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#a78bfa");
  const [brushSize, setBrushSize] = useState(3);
  const [shape, setShape] = useState<Shape>("line");
  const [background, setBackground] = useState<Background>("blank");
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfName, setPdfName] = useState("");
  const [pdfSaving, setPdfSaving] = useState(false);

  const saveTypedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "notes"), where("uid", "==", user.uid));
    return onSnapshot(q, snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note))));
  }, [user]);

  useEffect(() => {
    if (view !== "typed" || saved) return;
    const t = setTimeout(() => saveTyped(true), 2000);
    return () => clearTimeout(t);
  }, [body, title, saved, view]);

  const drawBackground = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#1e1e2e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
    if (background === "lined") { for (let y = 40; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); } }
    else if (background === "grid") {
      for (let x = 40; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 40; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    } else if (background === "dotted") {
      for (let x = 40; x < canvas.width; x += 40)
        for (let y = 40; y < canvas.height; y += 40) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill(); }
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: ((e as React.MouseEvent).clientX - rect.left) * sx, y: ((e as React.MouseEvent).clientY - rect.top) * sy };
  };

  const pushHistory = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    setHistory(h => [...h.slice(-30), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setRedoStack([]);
  };

  const undo = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    if (!history.length) return;
    setRedoStack(r => [ctx.getImageData(0, 0, canvas.width, canvas.height), ...r]);
    ctx.putImageData(history[history.length - 1], 0, 0);
    setHistory(h => h.slice(0, -1));
  };

  const redo = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    if (!redoStack.length) return;
    setHistory(h => [...h, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    ctx.putImageData(redoStack[0], 0, 0);
    setRedoStack(r => r.slice(1));
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e); pushHistory(); setDrawing(true);
    lastPos.current = pos; startPos.current = pos;
    if (tool === "text") { setTextPos(pos); return; }
    if (tool === "lasso") setLassoRect(null);
  };

  const drawOnCanvas = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    if (["pen", "highlighter", "eraser"].includes(tool)) {
      ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y); ctx.lineTo(pos.x, pos.y);
      if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = 20; }
      else if (tool === "highlighter") { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.3; ctx.lineWidth = 18; ctx.strokeStyle = color; }
      else { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.lineWidth = brushSize; ctx.strokeStyle = color; }
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      lastPos.current = pos;
    }
    if (tool === "shapes" || tool === "ruler") {
      const ov = overlayRef.current!; const octx = ov.getContext("2d")!;
      octx.clearRect(0, 0, ov.width, ov.height);
      octx.strokeStyle = color; octx.lineWidth = brushSize; octx.lineCap = "round";
      const [sx, sy] = [startPos.current!.x, startPos.current!.y];
      if (tool === "ruler" || shape === "line") { octx.beginPath(); octx.moveTo(sx, sy); octx.lineTo(pos.x, pos.y); octx.stroke(); }
      else if (shape === "rect") octx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      else { const rx = Math.abs(pos.x - sx) / 2, ry = Math.abs(pos.y - sy) / 2; octx.beginPath(); octx.ellipse(sx + (pos.x - sx) / 2, sy + (pos.y - sy) / 2, rx, ry, 0, 0, Math.PI * 2); octx.stroke(); }
    }
    if (tool === "lasso") {
      const [sx, sy] = [startPos.current!.x, startPos.current!.y];
      setLassoRect({ x: Math.min(sx, pos.x), y: Math.min(sy, pos.y), w: Math.abs(pos.x - sx), h: Math.abs(pos.y - sy) });
    }
  };

  const stopDrawOnCanvas = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return; setDrawing(false);
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    if (tool === "shapes" || tool === "ruler") {
      overlayRef.current!.getContext("2d")!.clearRect(0, 0, 1600, 1000);
      ctx.strokeStyle = color; ctx.lineWidth = brushSize; ctx.lineCap = "round";
      const [sx, sy] = [startPos.current!.x, startPos.current!.y];
      if (tool === "ruler" || shape === "line") { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
      else if (shape === "rect") ctx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      else { const rx = Math.abs(pos.x - sx) / 2, ry = Math.abs(pos.y - sy) / 2; ctx.beginPath(); ctx.ellipse(sx + (pos.x - sx) / 2, sy + (pos.y - sy) / 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    lastPos.current = null;
  };

  const commitText = () => {
    if (!textInput.trim() || !textPos) return;
    const ctx = canvasRef.current!.getContext("2d", { willReadFrequently: true })!;
    ctx.font = `${brushSize * 6}px 'Segoe UI'`; ctx.fillStyle = color;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextInput(""); setTextPos(null);
  };

  const saveTyped = async (auto = false) => {
    if (!user || !title.trim()) return;
    if (activeNote || saveTypedRef.current) {
      const id = activeNote?.id || saveTypedRef.current!;
      await updateDoc(doc(db, "notes", id), { title, body, updatedAt: Date.now() });
    } else {
      const ref = await addDoc(collection(db, "notes"), { title, body, uid: user.uid, type: "typed", updatedAt: Date.now() });
      saveTypedRef.current = ref.id;
      setActiveNote({ id: ref.id, title, body, uid: user.uid, type: "typed" });
    }
    setSaved(true);
    if (!auto) alert("Saved! ✅");
  };

  const saveCanvas = async () => {
    if (!title.trim()) { alert("Add a title first!"); return; }
    const canvasData = canvasRef.current!.toDataURL("image/jpeg", 0.6);
    if (activeNote) await updateDoc(doc(db, "notes", activeNote.id), { canvasData, title, updatedAt: Date.now() });
    else { const ref = await addDoc(collection(db, "notes"), { title, uid: user!.uid, type: "handwritten", canvasData, updatedAt: Date.now() }); setActiveNote({ id: ref.id, title, uid: user!.uid, type: "handwritten", canvasData }); }
    alert("Saved! ✅");
  };

  const savePDF = async () => {
    if (!title.trim() || !user) { alert("Add a title!"); return; }
    if (pdfPages.length === 0) { alert("Import a PDF first!"); return; }
    setPdfSaving(true);
    try {
      if (activeNote) {
        await updateDoc(doc(db, "notes", activeNote.id), { title, pdfName, updatedAt: Date.now() });
      } else {
        const ref = await addDoc(collection(db, "notes"), { title, uid: user.uid, type: "pdf", pdfName, updatedAt: Date.now() });
        setActiveNote({ id: ref.id, title, uid: user.uid, type: "pdf", pdfName });
      }
      alert("Saved! ✅ Note: Re-import the PDF next time to annotate again.");
    } catch (err) {
      alert("Save failed. Try again.");
    }
    setPdfSaving(false);
  };

  const deleteNote = async (id: string) => { await deleteDoc(doc(db, "notes", id)); };

  const openNote = (note: Note) => {
    setActiveNote(note); setTitle(note.title); setBody(note.body || ""); setView(note.type);
    if (note.type === "handwritten" && note.canvasData) {
      setTimeout(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const img = new Image();
        img.onload = () => canvas.getContext("2d", { willReadFrequently: true })?.drawImage(img, 0, 0);
        img.src = note.canvasData!;
      }, 400);
    }
    if (note.type === "pdf") {
      setPdfName(note.pdfName || "");
      setPdfPages([]);
    }
  };

  const newNote = (type: "typed" | "handwritten" | "pdf") => {
    setActiveNote(null); saveTypedRef.current = null; setTitle(""); setBody(""); setPdfPages([]); setPdfName(""); setView(type); setSaved(true);
    setTimeout(() => { if (type === "handwritten") drawBackground(); }, 150);
  };

  const handlePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPdfName(file.name);
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const c = document.createElement("canvas");
        c.width = viewport.width; c.height = viewport.height;
        await page.render({ canvasContext: c.getContext("2d")! as any, viewport } as any).promise;
        pages.push(c.toDataURL("image/jpeg", 0.8));
      }
      setPdfPages(pages);
      if (!title) setTitle(file.name.replace(".pdf", ""));
    } catch (err) {
      alert("Failed to load PDF. Please try another file.");
    }
  };

  const bgGrad = "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)";
  const btn = (active = false, danger = false) => ({
    padding: "7px 14px", borderRadius: "10px", border: "none", fontSize: "0.82rem", fontWeight: "600" as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.25)" : active ? "linear-gradient(135deg, #667eea, #764ba2)" : "rgba(255,255,255,0.08)",
    color: danger ? "#ff6b6b" : "white",
  });

  const Toolbar = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap", background: "rgba(0,0,0,0.4)" }}>
      {([["pen", "🖊️ Pen"], ["highlighter", "🖍️ Hi-lite"], ["eraser", "⬜ Eraser"], ["shapes", "📐 Shape"], ["ruler", "📏 Ruler"], ["text", "🔤 Text"], ["lasso", "🔲 Select"]] as [Tool, string][]).map(([t, label]) => (
        <button key={t} onClick={() => setTool(t)} style={btn(tool === t)}>{label}</button>
      ))}
      <div style={{ width: "1px", height: "26px", background: "rgba(255,255,255,0.12)" }} />
      {tool === "shapes" && (["line", "rect", "circle"] as Shape[]).map(s => (
        <button key={s} onClick={() => setShape(s)} style={btn(shape === s)}>{s === "line" ? "╱" : s === "rect" ? "▭" : "○"}</button>
      ))}
      <input type="range" min={1} max={14} value={brushSize} onChange={e => setBrushSize(+e.target.value)} style={{ width: "70px", accentColor: "#a78bfa" }} />
      <div style={{ display: "flex", gap: "4px" }}>
        {PRESET_COLORS.map(c => <div key={c} onClick={() => setColor(c)} style={{ width: "20px", height: "20px", borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "2px solid white" : "2px solid transparent" }} />)}
      </div>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: "26px", height: "26px", borderRadius: "50%", border: "none", cursor: "pointer" }} />
      <div style={{ width: "1px", height: "26px", background: "rgba(255,255,255,0.12)" }} />
      <button onClick={undo} style={btn()}>↩️</button>
      <button onClick={redo} style={btn()}>↪️</button>
    </div>
  );

  if (view === "typed") return (
    <div style={{ minHeight: "100vh", background: bgGrad, color: "white", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid rgba(255,255,255,0.08)", gap: "12px" }}>
        <button onClick={() => setView("list")} style={btn()}>← Back</button>
        <span style={{ color: saved ? "#6ee7b7" : "#fbbf24", fontSize: "0.85rem" }}>{saved ? "✓ Auto-saved" : "Editing..."}</span>
        <button onClick={() => saveTyped(false)} style={btn(true)}>💾 Save</button>
      </div>
      <div style={{ padding: "32px 48px", flex: 1, display: "flex", flexDirection: "column" }}>
        <input value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} placeholder="Untitled Note" style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "2rem", fontWeight: "bold", outline: "none", marginBottom: "24px", paddingBottom: "12px", width: "100%", boxSizing: "border-box" as const }} />
        <textarea value={body} onChange={e => { setBody(e.target.value); setSaved(false); }} placeholder="Start writing..." style={{ flex: 1, minHeight: "65vh", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "white", fontSize: "1.05rem", outline: "none", padding: "24px", resize: "none", lineHeight: "1.9", boxSizing: "border-box" as const, fontFamily: "'Segoe UI', sans-serif" }} />
      </div>
    </div>
  );

  if (view === "handwritten") return (
    <div style={{ minHeight: "100vh", background: bgGrad, color: "white", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", flexWrap: "wrap" }}>
        <button onClick={() => setView("list")} style={btn()}>←</button>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled" style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "1rem", outline: "none", width: "140px" }} />
        {(["blank", "lined", "grid", "dotted"] as Background[]).map(b => <button key={b} onClick={() => { if (!activeNote) setBackground(b); }} style={btn(background === b)}>{b}</button>)}
        <button onClick={() => { pushHistory(); drawBackground(); }} style={btn(false, true)}>🗑️ Clear</button>
        <button onClick={saveCanvas} style={btn(true)}>💾 Save</button>
      </div>
      <Toolbar />
      <div style={{ position: "relative", margin: "16px auto", width: "98%" }}>
        <canvas ref={canvasRef} width={1600} height={1000}
          style={{ width: "100%", borderRadius: "12px", display: "block", cursor: "crosshair", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={drawOnCanvas} onMouseUp={stopDrawOnCanvas} onMouseLeave={stopDrawOnCanvas}
          onTouchStart={startDraw} onTouchMove={drawOnCanvas} onTouchEnd={stopDrawOnCanvas}
        />
        <canvas ref={overlayRef} width={1600} height={1000} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: "12px" }} />
        {lassoRect && <div style={{ position: "absolute", border: "2px dashed #a78bfa", borderRadius: "4px", pointerEvents: "none", left: `${(lassoRect.x / 1600) * 100}%`, top: `${(lassoRect.y / 1000) * 100}%`, width: `${(lassoRect.w / 1600) * 100}%`, height: `${(lassoRect.h / 1000) * 100}%` }} />}
        {textPos && <div style={{ position: "absolute", left: `${(textPos.x / 1600) * 100}%`, top: `${(textPos.y / 1000) * 100}%` }}>
          <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === "Enter" && commitText()} placeholder="Type, press Enter" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #a78bfa", borderRadius: "6px", color, fontSize: `${brushSize * 6}px`, outline: "none", padding: "4px 8px", minWidth: "180px" }} />
        </div>}
      </div>
    </div>
  );

  if (view === "pdf") return (
    <div style={{ minHeight: "100vh", background: bgGrad, color: "white", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", flexWrap: "wrap" }}>
        <button onClick={() => setView("list")} style={btn()}>← Back</button>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="PDF title..." style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "1rem", outline: "none", width: "160px" }} />
        {pdfPages.length > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{pdfPages.length} pages • {pdfName}</span>}
        <button onClick={savePDF} style={btn(true)} disabled={pdfSaving}>{pdfSaving ? "Saving..." : "💾 Save"}</button>
      </div>
      {pdfPages.length > 0 && <Toolbar />}
      <div style={{ padding: "20px 32px" }}>
        {pdfPages.length === 0 && (
          <div>
            {activeNote && (
              <div style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "20px", color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
                📎 Previously saved: <strong>{pdfName}</strong><br />
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>Re-import the PDF file below to continue annotating.</span>
              </div>
            )}
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "320px", border: "2px dashed rgba(255,255,255,0.12)", borderRadius: "20px", cursor: "pointer", gap: "14px" }}>
              <span style={{ fontSize: "3.5rem" }}>📄</span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>Click to import PDF</span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>Draw, highlight and annotate on every page</span>
              <input type="file" accept=".pdf" onChange={handlePDF} style={{ display: "none" }} />
            </label>
          </div>
        )}
        {pdfPages.map((page, i) => (
          <div key={i} style={{ marginBottom: "24px" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", marginBottom: "6px" }}>Page {i + 1}</p>
            <DrawingCanvas
              backgroundImage={page}
              tool={tool} color={color} brushSize={brushSize} shape={shape}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bgGrad, color: "white", fontFamily: "'Segoe UI', sans-serif", padding: "32px" }}>
      <button onClick={() => navigate("/")} style={{ ...btn(), marginBottom: "20px" }}>← Dashboard</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", margin: 0 }}>📝 Notes</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: "4px 0 0", fontSize: "0.9rem" }}>{notes.length} notes</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => newNote("typed")} style={btn(true)}>✏️ Typed</button>
          <button onClick={() => newNote("handwritten")} style={btn(true)}>🖊️ Handwritten</button>
          <button onClick={() => newNote("pdf")} style={btn(true)}>📄 PDF</button>
        </div>
      </div>
      {notes.length === 0 && <p style={{ color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: "80px", fontSize: "1.1rem" }}>No notes yet! 🌸</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
        {notes.map(note => (
          <div key={note.id} onClick={() => openNote(note)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <strong>{note.type === "typed" ? "✏️" : note.type === "handwritten" ? "🖊️" : "📄"} {note.title}</strong>
              <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer" }}>🗑️</button>
            </div>
            {note.type === "typed" && <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: "0.85rem", overflow: "hidden", maxHeight: "56px" }}>{note.body?.slice(0, 120)}</p>}
            {note.type === "handwritten" && note.canvasData && <img src={note.canvasData} alt="preview" style={{ width: "100%", borderRadius: "8px", maxHeight: "110px", objectFit: "cover" }} />}
            {note.type === "pdf" && <p style={{ color: "rgba(255,255,255,0.35)", margin: 0, fontSize: "0.8rem" }}>📎 {note.pdfName}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}