import { useState, useEffect } from "react";
import { db, storage } from "../../firebase/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "../../context/AuthContext";

interface Resource {
  id: string;
  name: string;
  type: "pdf" | "image" | "link" | "note";
  url?: string;
  content?: string;
  addedBy: string;
  addedAt: number;
  storagePath?: string;
}

export default function ResourceLibrary({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const username = (user as any)?.username || user?.displayName || user?.email?.split("@")[0] || "User";
  const [resources, setResources] = useState<Resource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteName, setNoteName] = useState("");
  const [tab, setTab] = useState<"all" | "add">("all");

  useEffect(() => {
    const q = query(collection(db, "studyrooms", roomId, "resources"), orderBy("addedAt", "desc"));
    return onSnapshot(q, snap => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource))));
  }, [roomId]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    setUploading(true);
    try {
      const path = `studyrooms/${roomId}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      const type = file.type.includes("pdf") ? "pdf" : "image";
      await addDoc(collection(db, "studyrooms", roomId, "resources"), {
        name: file.name, type, url, storagePath: path,
        addedBy: username, addedAt: Date.now()
      });
    } catch { alert("Upload failed. Check Firebase Storage rules."); }
    setUploading(false);
    e.target.value = "";
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    await addDoc(collection(db, "studyrooms", roomId, "resources"), {
      name: linkName || url, type: "link", url, addedBy: username, addedAt: Date.now()
    });
    setLinkUrl(""); setLinkName("");
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    await addDoc(collection(db, "studyrooms", roomId, "resources"), {
      name: noteName || "Quick note", type: "note", content: noteText,
      addedBy: username, addedAt: Date.now()
    });
    setNoteText(""); setNoteName("");
  };

  const deleteResource = async (r: Resource) => {
    if (r.storagePath) {
      try { await deleteObject(storageRef(storage, r.storagePath)); } catch {}
    }
    await deleteDoc(doc(db, "studyrooms", roomId, "resources", r.id));
  };

  const ICON: Record<string, string> = { pdf: "📄", image: "🖼️", link: "🔗", note: "📝" };

  const btn = (active = false) => ({
    padding: "8px 18px", borderRadius: "10px", border: "none", fontSize: "0.85rem", fontWeight: 600 as const, cursor: "pointer",
    background: active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)", color: "white"
  });

  const inputStyle = { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "white", padding: "10px 14px", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const, marginBottom: 10 };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8 }}>
        <button onClick={() => setTab("all")} style={btn(tab === "all")}>📚 All Resources ({resources.length})</button>
        <button onClick={() => setTab("add")} style={btn(tab === "add")}>➕ Add Resource</button>
      </div>

      {tab === "add" && (
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Upload file */}
          <div>
            <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>📤 Upload PDF or Image</p>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 90, border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, cursor: "pointer", gap: 10, color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
              {uploading ? "Uploading..." : "Click to choose a file"}
              <input type="file" accept=".pdf,image/*" onChange={uploadFile} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>

          {/* Add link */}
          <div>
            <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>🔗 Add a Link</p>
            <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Label (optional)" style={inputStyle} />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            <button onClick={addLink} style={btn(true)}>Add Link</button>
          </div>

          {/* Add quick note */}
          <div>
            <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>📝 Add a Quick Note</p>
            <input value={noteName} onChange={e => setNoteName(e.target.value)} placeholder="Note title..." style={inputStyle} />
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write something..."
              style={{ ...inputStyle, resize: "none", minHeight: 90, lineHeight: "1.6", fontFamily: "'Segoe UI', sans-serif" }} />
            <button onClick={addNote} style={btn(true)}>Add Note</button>
          </div>
        </div>
      )}

      {tab === "all" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {resources.length === 0 && <p style={{ color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 60 }}>No resources yet — add PDFs, links, or notes!</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {resources.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px" }}>
                <span style={{ fontSize: "1.4rem" }}>{ICON[r.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>Added by {r.addedBy} • {new Date(r.addedAt).toLocaleDateString()}</p>
                  {r.type === "note" && <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", overflow: "hidden", maxHeight: 40 }}>{r.content}</p>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(r.type === "pdf" || r.type === "image" || r.type === "link") && r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.07)", color: "white", textDecoration: "none", fontSize: "0.8rem" }}>Open ↗</a>
                  )}
                  <button onClick={() => deleteResource(r)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "1rem" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}