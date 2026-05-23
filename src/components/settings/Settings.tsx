import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db, storage } from "../../firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

export default function Settings() {
  const { user, logout } = useAuth() as any;
  const username = (user as any)?.username || user?.displayName || user?.email?.split("@")[0] || "User";

  const [activeTab, setActiveTab] = useState<"profile" | "account" | "appearance" | "notifications">("profile");

  // Profile
  const [displayName, setDisplayName] = useState(username);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Appearance
  const [accentColor, setAccentColor] = useState("#7c3aed");
  const [fontSize, setFontSize] = useState("medium");

  // Notifications
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyExams, setNotifyExams] = useState(true);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim()
      });
      setSavedMsg("Profile saved! ✨");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch {}
    setSaving(false);
  };

  const changePassword = async () => {
    setPwError(""); setPwSuccess("");
    if (!newPassword || !currentPassword) { setPwError("Fill in all fields."); return; }
    if (newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords don't match."); return; }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPwSuccess("Password changed successfully! ✓");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      setPwError(e.message?.includes("wrong-password") ? "Current password is incorrect." : "Failed to change password.");
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setSavedMsg("Notifications enabled! ✨");
        setTimeout(() => setSavedMsg(""), 3000);
      }
    }
  };

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const panel = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "white", padding: "10px 14px", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "'Segoe UI',sans-serif"
  };
  const btn = (active = false, danger = false) => ({
    padding: "9px 22px", borderRadius: 10, border: "none", fontSize: "0.85rem",
    fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white"
  });

  const TABS = [
    { id: "profile", label: "👤 Profile" },
    { id: "account", label: "🔒 Account" },
    { id: "appearance", label: "🎨 Appearance" },
    { id: "notifications", label: "🔔 Notifications" },
  ] as const;

  const ACCENT_COLORS = ["#7c3aed","#2563eb","#db2777","#059669","#d97706","#dc2626","#0891b2","#7c3aed"];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>⚙️ Settings</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Manage your account and preferences</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>

          {/* Tab sidebar */}
          <div style={{ ...panel, padding: "12px 10px", height: "fit-content" }}>
            {TABS.map(tab => (
              <div key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 4,
                  background: activeTab === tab.id ? "linear-gradient(135deg,rgba(102,126,234,0.25),rgba(118,75,162,0.25))" : "transparent",
                  borderLeft: activeTab === tab.id ? "3px solid #7c3aed" : "3px solid transparent",
                  fontSize: "0.88rem", fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.55)",
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = "transparent"; }}>
                {tab.label}
              </div>
            ))}
          </div>

          {/* Tab content */}
          <div>

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div style={{ ...panel, padding: "28px 32px" }}>
                <h3 style={{ margin: "0 0 24px", fontSize: "1.1rem" }}>👤 Profile</h3>

                {/* Avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "linear-gradient(135deg,#667eea,#764ba2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2rem", fontWeight: 700, flexShrink: 0
                  }}>
                    {username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: "1rem" }}>{username}</p>
                    <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{user?.email}</p>
                    <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 20, background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>Student</span>
                  </div>
                </div>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Display name</p>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
                </label>

                <label style={{ display: "block", marginBottom: 20 }}>
                  <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Bio</p>
                  <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Tell others a bit about yourself..."
                    style={{ ...inputStyle, resize: "none", minHeight: 80, lineHeight: "1.6" }} />
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={saveProfile} disabled={saving} style={btn(true)}>
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                  {savedMsg && <span style={{ color: "#6ee7b7", fontSize: "0.85rem" }}>{savedMsg}</span>}
                </div>
              </div>
            )}

            {/* ACCOUNT */}
            {activeTab === "account" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...panel, padding: "28px 32px" }}>
                  <h3 style={{ margin: "0 0 20px", fontSize: "1.1rem" }}>🔒 Change Password</h3>

                  <label style={{ display: "block", marginBottom: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Current password</p>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={{ display: "block", marginBottom: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>New password</p>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={{ display: "block", marginBottom: 18 }}>
                    <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Confirm new password</p>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
                  </label>

                  {pwError && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: 12 }}>{pwError}</p>}
                  {pwSuccess && <p style={{ color: "#6ee7b7", fontSize: "0.85rem", marginBottom: 12 }}>{pwSuccess}</p>}

                  <button onClick={changePassword} style={btn(true)}>Update Password</button>
                </div>

                <div style={{ ...panel, padding: "24px 32px" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "1rem", color: "#f87171" }}>⚠️ Danger Zone</h3>
                  <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>These actions cannot be undone.</p>
                  <button onClick={() => logout?.()} style={btn(false, true)}>Sign Out</button>
                </div>
              </div>
            )}

            {/* APPEARANCE */}
            {activeTab === "appearance" && (
              <div style={{ ...panel, padding: "28px 32px" }}>
                <h3 style={{ margin: "0 0 24px", fontSize: "1.1rem" }}>🎨 Appearance</h3>

                <div style={{ marginBottom: 28 }}>
                  <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Accent Color</p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                    {ACCENT_COLORS.map(c => (
                      <div key={c} onClick={() => setAccentColor(c)} style={{
                        width: 36, height: 36, borderRadius: "50%", background: c, cursor: "pointer",
                        border: accentColor === c ? "3px solid white" : "3px solid transparent",
                        boxShadow: accentColor === c ? `0 0 12px ${c}` : "none",
                        transition: "all 0.2s"
                      }} />
                    ))}
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: "none" }} />
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Font Size</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["small","medium","large"] as const).map(size => (
                      <button key={size} onClick={() => setFontSize(size)} style={btn(fontSize === size)}>
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview card */}
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "20px 24px", border: `1px solid ${accentColor}44` }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: fontSize === "small" ? "0.85rem" : fontSize === "large" ? "1.1rem" : "0.95rem", color: accentColor }}>Preview</p>
                  <p style={{ margin: 0, fontSize: fontSize === "small" ? "0.78rem" : fontSize === "large" ? "1rem" : "0.88rem", color: "rgba(255,255,255,0.6)" }}>
                    This is how your text will look across StudyNest.
                  </p>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div style={{ ...panel, padding: "28px 32px" }}>
                <h3 style={{ margin: "0 0 24px", fontSize: "1.1rem" }}>🔔 Notifications</h3>

                <button onClick={requestNotificationPermission}
                  style={{ ...btn(true), marginBottom: 28, display: "block" }}>
                  Enable Browser Notifications
                </button>

                {[
                  { label: "Task Reminders", desc: "Get alerted when a task reminder fires", value: notifyReminders, set: setNotifyReminders },
                  { label: "New Messages", desc: "Notify when you receive a new message", value: notifyMessages, set: setNotifyMessages },
                  { label: "Exam Countdowns", desc: "Alert 1 day before an upcoming exam", value: notifyExams, set: setNotifyExams },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{item.label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{item.desc}</p>
                    </div>
                    <div onClick={() => item.set(!item.value)} style={{
                      width: 52, height: 28, borderRadius: 14, cursor: "pointer", position: "relative",
                      background: item.value ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.1)",
                      transition: "all 0.25s", flexShrink: 0
                    }}>
                      <div style={{
                        position: "absolute", top: 3, left: item.value ? 26 : 3,
                        width: 22, height: 22, borderRadius: "50%", background: "white",
                        transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}