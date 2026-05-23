import { useState, useRef, useEffect } from "react";

const PLAYLISTS = [
  { label: "Lo-Fi Study", id: "37i9dQZF1DX8Uebhn9wzrS", emoji: "🎵" },
  { label: "Deep Focus", id: "37i9dQZF1DWZeKCadgRdKQ", emoji: "🧠" },
  { label: "Classical Study", id: "37i9dQZF1DWV0gynK7G6pD", emoji: "🎻" },
  { label: "Jazz Vibes", id: "37i9dQZF1DXbITWG1ZJKYt", emoji: "🎷" },
  { label: "Peaceful Piano", id: "37i9dQZF1DX4sWSpwq3LiO", emoji: "🎹" },
];

export default function SpotifyWidget() {
  const [selected, setSelected] = useState(PLAYLISTS[0]);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 32, y: 32 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, iframe")) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = dragStart.current.mx - e.clientX;
      const dy = dragStart.current.my - e.clientY;
      setPos({
        x: Math.max(8, dragStart.current.px + dx),
        y: Math.max(8, dragStart.current.py + dy),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      {/* Minimized icon — always rendered when minimized */}
      {minimized && (
        <div
          onClick={() => setMinimized(false)}
          style={{
            position: "fixed", bottom: pos.y, right: pos.x, zIndex: 1000,
            width: "52px", height: "52px", borderRadius: "50%",
            background: "linear-gradient(135deg, #f97b5c, #fbab72)",
            boxShadow: "0 4px 20px rgba(249,123,92,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "1.4rem", transition: "transform 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          title="Open Study Music"
        >🎵</div>
      )}

      {/* Full widget — always mounted, hidden via display:none when minimized so music keeps playing */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "fixed", bottom: pos.y, right: pos.x, zIndex: 1000,
          width: "340px",
          display: minimized ? "none" : "block",
          background: "rgba(255, 245, 240, 0.92)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(249,123,92,0.2)", borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(249,123,92,0.15), 0 2px 8px rgba(0,0,0,0.08)",
          cursor: "grab", userSelect: "none",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "12px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          borderBottom: open ? "1px solid rgba(249,123,92,0.15)" : "none",
          background: "linear-gradient(135deg, rgba(254,243,199,0.6), rgba(252,213,197,0.6))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>🎵</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#1e2a3a" }}>Study Music</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setOpen(o => !o)} style={{
              background: "rgba(249,123,92,0.12)", border: "none", borderRadius: "50%",
              width: "26px", height: "26px", color: "#f97b5c", cursor: "pointer", fontSize: "0.7rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{open ? "▲" : "▼"}</button>
            <button onClick={() => setMinimized(true)} style={{
              background: "rgba(249,123,92,0.12)", border: "none", borderRadius: "50%",
              width: "26px", height: "26px", color: "#f97b5c", cursor: "pointer", fontSize: "0.8rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} title="Minimize">—</button>
          </div>
        </div>

        {/* Playlist picker */}
        {open && (
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid rgba(249,123,92,0.15)",
            display: "flex", gap: 6, flexWrap: "wrap" as const,
            background: "rgba(255,249,246,0.7)",
          }}>
            {PLAYLISTS.map(p => (
              <button key={p.id} onClick={() => setSelected(p)} style={{
                padding: "5px 11px", borderRadius: 20,
                border: "1px solid rgba(249,123,92,0.2)",
                background: selected.id === p.id ? "rgba(249,123,92,0.18)" : "rgba(255,255,255,0.6)",
                color: selected.id === p.id ? "#f97b5c" : "#4a5568",
                cursor: "pointer", fontSize: "0.76rem",
                fontWeight: selected.id === p.id ? 600 : 400,
              }}>
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Spotify embed — always mounted */}
        <iframe
          src={`https://open.spotify.com/embed/playlist/${selected.id}?utm_source=generator&theme=0`}
          width="100%" height="152" frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy" style={{ display: "block", cursor: "auto" }}
        />
      </div>
    </>
  );
}