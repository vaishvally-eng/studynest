import { useRef, useState, useEffect } from "react";
import { ref, set, onValue, off } from "firebase/database";
import { rtdb } from "../../firebase/firebase";

const COLORS = ["#ffffff", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa", "#f87171", "#000000"];

export default function Whiteboard({ roomId }: { roomId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser" | "line" | "rect" | "circle" | "text">("pen");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    const wbRef = ref(rtdb, `rooms/${roomId}/whiteboard`);
    onValue(wbRef, snap => {
      const data = snap.val();
      if (!data || isRemoteUpdate.current) return;
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = data;
    });
    return () => off(wbRef);
  }, [roomId]);

  const pushToFirebase = () => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async () => {
      const canvas = canvasRef.current; if (!canvas) return;
      isRemoteUpdate.current = true;
      await set(ref(rtdb, `rooms/${roomId}/whiteboard`), canvas.toDataURL());
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
    }, 300);
  };

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = (e: React.MouseEvent) => {
    const pos = getPos(e);
    setDrawing(true);
    startPos.current = pos;
    lastPos.current = pos;
    if (tool === "text") { setTextPos(pos); return; }
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const draw = (e: React.MouseEvent) => {
    if (!drawing || tool === "text") return;
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = 24; }
      else { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = color; ctx.lineWidth = size; }
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      lastPos.current = pos;
    } else {
      const ov = overlayRef.current!; const octx = ov.getContext("2d")!;
      octx.clearRect(0, 0, ov.width, ov.height);
      octx.strokeStyle = color; octx.lineWidth = size; octx.lineCap = "round";
      const sx = startPos.current!.x, sy = startPos.current!.y;
      if (tool === "line") { octx.beginPath(); octx.moveTo(sx, sy); octx.lineTo(pos.x, pos.y); octx.stroke(); }
      else if (tool === "rect") octx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      else { const rx = Math.abs(pos.x - sx) / 2, ry = Math.abs(pos.y - sy) / 2; octx.beginPath(); octx.ellipse(sx + (pos.x - sx) / 2, sy + (pos.y - sy) / 2, rx, ry, 0, 0, Math.PI * 2); octx.stroke(); }
    }
  };

  const stopDraw = (e: React.MouseEvent) => {
    if (!drawing || tool === "text") return;
    setDrawing(false);
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    if (tool !== "pen" && tool !== "eraser") {
      overlayRef.current!.getContext("2d")!.clearRect(0, 0, 1600, 900);
      ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = "round";
      const sx = startPos.current!.x, sy = startPos.current!.y;
      if (tool === "line") { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
      else if (tool === "rect") ctx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      else { const rx = Math.abs(pos.x - sx) / 2, ry = Math.abs(pos.y - sy) / 2; ctx.beginPath(); ctx.ellipse(sx + (pos.x - sx) / 2, sy + (pos.y - sy) / 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    pushToFirebase();
  };

  const commitText = () => {
    if (!textInput.trim() || !textPos) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.font = `${size * 5}px 'Segoe UI'`; ctx.fillStyle = color;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextInput(""); setTextPos(null);
    pushToFirebase();
  };

  const clearBoard = async () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    await set(ref(rtdb, `rooms/${roomId}/whiteboard`), "");
  };

  const tools: [typeof tool, string][] = [["pen","🖊️ Pen"],["eraser","⬜ Erase"],["line","╱ Line"],["rect","▭ Rect"],["circle","○ Circle"],["text","🔤 Text"]];

  const btn = (active = false, danger = false) => ({
    padding: "6px 12px", borderRadius: "8px", border: "none", fontSize: "0.8rem", fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white"
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap", background: "rgba(0,0,0,0.2)" }}>
        {tools.map(([t, label]) => <button key={t} onClick={() => setTool(t)} style={btn(tool === t)}>{label}</button>)}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
        <input type="range" min={1} max={14} value={size} onChange={e => setSize(+e.target.value)} style={{ width: 70, accentColor: "#a78bfa" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {COLORS.map(c => <div key={c} onClick={() => setColor(c)} style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "2px solid white" : "2px solid transparent" }} />)}
        </div>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer" }} />
        <button onClick={clearBoard} style={{ ...btn(false, true), marginLeft: "auto" }}>🗑️ Clear all</button>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#1a1a2e" }}>
        <canvas ref={canvasRef} width={1600} height={900}
          style={{ width: "100%", height: "100%", cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        />
        <canvas ref={overlayRef} width={1600} height={900}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
        {textPos && (
          <div style={{ position: "absolute", left: `${(textPos.x / 1600) * 100}%`, top: `${(textPos.y / 900) * 100}%` }}>
            <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitText()}
              placeholder="Type, press Enter"
              style={{ background: "rgba(0,0,0,0.8)", border: "1px solid #a78bfa", borderRadius: 6, color, fontSize: `${size * 5}px`, outline: "none", padding: "4px 8px", minWidth: 160 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
