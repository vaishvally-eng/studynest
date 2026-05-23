import { useState } from "react";

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

  return (
    <div style={{
      position: "fixed",
      bottom: "32px",
      right: "32px",
      zIndex: 1000,
      width: "340px",
      background: "rgba(255, 245, 240, 0.75)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(249,123,92,0.2)",
      borderRadius: "24px",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(249,123,92,0.15), 0 2px 8px rgba(0,0,0,0.08)",
      transition: "all 0.3s ease",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: open ? "1px solid rgba(249,123,92,0.15)" : "none",
        background: "linear-gradient(135deg, rgba(254,243,199,0.5), rgba(252,213,197,0.5))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>🎵</span>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Study Music</p>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{
          background: "rgba(249,123,92,0.1)",
          border: "none",
          borderRadius: "50%",
          width: "28px",
          height: "28px",
          color: "var(--accent)",
          cursor: "pointer",
          fontSize: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {open ? "▲" : "▼"}
        </button>
      </div>

      {/* Playlist picker */}
      {open && (
        <div style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(249,123,92,0.15)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap" as const,
          background: "rgba(255,249,246,0.6)",
        }}>
          {PLAYLISTS.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid rgba(249,123,92,0.2)",
              background: selected.id === p.id ? "rgba(249,123,92,0.15)" : "rgba(255,255,255,0.5)",
              color: selected.id === p.id ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: selected.id === p.id ? 600 : 400,
              backdropFilter: "blur(8px)",
            }}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Spotify embed */}
      <iframe
        src={`https://open.spotify.com/embed/playlist/${selected.id}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ display: "block" }}
      />
    </div>
  );
}