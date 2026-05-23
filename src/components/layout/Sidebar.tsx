import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useState } from "react";

const NAV = [
  {
    category: "SANCTUARY",
    items: [
      { emoji: "🏠", label: "Dashboard", path: "/" },
      { emoji: "📝", label: "Notes", path: "/notes" },
      { emoji: "🏫", label: "Study Rooms", path: "/studyroom" },
    ]
  },
  {
    category: "KNOWLEDGE",
    items: [
      { emoji: "🃏", label: "Flashcards", path: "/flashcards" },
      { emoji: "📅", label: "Exams", path: "/exams" },
      { emoji: "📖", label: "Journal", path: "/journal" },
    ]
  },
  {
    category: "GROWTH",
    items: [
      { emoji: "✅", label: "Tasks", path: "/tasks" },
      { emoji: "🔥", label: "Habit Tracker", path: "/habits" },
      { emoji: "⏰", label: "Alarm", path: "/alarm" },
    ]
  },
  {
    category: "SOCIAL",
    items: [
      { emoji: "💬", label: "Messaging", path: "/messaging" },
      { emoji: "👥", label: "Friends", path: "/friends" },
    ]
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth() as any;
  const { theme, toggleTheme } = useTheme();
  const username = (user as any)?.username || user?.displayName || user?.email?.split("@")[0] || "User";
  const [collapsed, setCollapsed] = useState(false);

  const s = {
    sidebar: {
      width: collapsed ? "72px" : "240px",
      minHeight: "100vh",
      background: "var(--bg-sidebar)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column" as const,
      position: "fixed" as const,
      top: 0, left: 0, bottom: 0,
      transition: "width 0.3s ease",
      zIndex: 100,
      overflow: "hidden",
    },
    logo: {
      padding: collapsed ? "24px 0" : "24px 20px",
      borderBottom: "1px solid var(--border-light)",
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "space-between",
      gap: 10,
    },
    logoText: {
      fontFamily: "'Georgia', serif",
      fontSize: "1.3rem",
      fontWeight: 700,
      background: "var(--gradient)",
      WebkitBackgroundClip: "text" as const,
      WebkitTextFillColor: "transparent" as const,
      whiteSpace: "nowrap" as const,
    },
    nav: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "12px 0",
    },
    category: {
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: "var(--text-muted)",
      padding: collapsed ? "16px 0 6px" : "16px 20px 6px",
      textAlign: collapsed ? "center" as const : "left" as const,
    },
    item: (active: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: collapsed ? "10px 0" : "10px 20px",
      justifyContent: collapsed ? "center" : "flex-start",
      cursor: "pointer",
      borderRadius: collapsed ? 0 : "0 20px 20px 0",
      marginRight: collapsed ? 0 : 12,
      background: active ? "var(--accent-soft)" : "transparent",
      borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
      transition: "all 0.2s",
      color: active ? "var(--accent)" : "var(--text-secondary)",
      fontWeight: active ? 600 : 400,
      fontSize: "0.88rem",
      whiteSpace: "nowrap" as const,
    }),
    emoji: {
      fontSize: "1.1rem",
      flexShrink: 0,
    },
    bottom: {
      padding: collapsed ? "16px 0" : "16px 20px",
      borderTop: "1px solid var(--border-light)",
      display: "flex",
      flexDirection: "column" as const,
      gap: 10,
    },
    avatar: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 10px",
      borderRadius: 16,
      background: "var(--accent-soft)",
      cursor: "pointer",
    },
    avatarCircle: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: "var(--gradient)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: "0.9rem",
      color: "white",
      flexShrink: 0,
    },
  };

  return (
    <div style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        {!collapsed && <span style={s.logoText}>StudyNest ✨</span>}
        <button onClick={() => setCollapsed(c => !c)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", fontSize: "1rem", flexShrink: 0,
          padding: 4, borderRadius: 8,
        }}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {NAV.map(section => (
          <div key={section.category}>
            <div style={s.category}>{collapsed ? "•" : section.category}</div>
            {section.items.map(item => {
              const active = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <div key={item.path} onClick={() => navigate(item.path)} style={s.item(active)}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <span style={s.emoji}>{item.emoji}</span>
                  {!collapsed && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={s.bottom}>
        {/* Theme toggle */}
        <div onClick={toggleTheme} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", borderRadius: 12, cursor: "pointer",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <span style={{ fontSize: "1rem" }}>{theme === "light" ? "🌙" : "☀️"}</span>
          {!collapsed && <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>}
        </div>

        {/* Settings */}
        <div onClick={() => navigate("/settings")} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", borderRadius: 12, cursor: "pointer",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <span style={{ fontSize: "1rem" }}>⚙️</span>
          {!collapsed && <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Settings</span>}
        </div>

        {/* User */}
        {!collapsed ? (
          <div style={s.avatar} onClick={() => logout?.()}>
            <div style={s.avatarCircle}>{username[0]?.toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{username}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>Sign out</p>
            </div>
          </div>
        ) : (
          <div style={{ ...s.avatarCircle, margin: "0 auto" }} onClick={() => logout?.()}>
            {username[0]?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}