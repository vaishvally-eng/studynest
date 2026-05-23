import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, query, where,
  orderBy, getDocs, doc, updateDoc, serverTimestamp
} from "firebase/firestore";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  read: boolean;
  conversationId: string;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageTime: any;
  lastSenderId: string;
}

export default function Messaging() {
  const { user } = useAuth();
  const username = (user as any)?.username || user?.displayName || user?.email?.split("@")[0] || "User";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid)
    );
    return onSnapshot(q, snap => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      convs.sort((a, b) => {
        const ta = a.lastMessageTime?.toMillis?.() || 0;
        const tb = b.lastMessageTime?.toMillis?.() || 0;
        return tb - ta;
      });
      setConversations(convs);
    });
  }, [user]);

  useEffect(() => {
    if (!activeConv) return;
    const q = query(
      collection(db, "conversations", activeConv.id, "messages"),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, [activeConv]);

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    setSearching(true);
    const q = query(
      collection(db, "users"),
      where("usernameLower", ">=", searchUser.toLowerCase()),
      where("usernameLower", "<=", searchUser.toLowerCase() + "\uf8ff")
    );
    const snap = await getDocs(q);
    setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.id !== user!.uid));
    setSearching(false);
  };

  const startConversation = async (otherUser: any) => {
    if (!user) return;
    const existingConv = conversations.find(c =>
      c.participants.includes(otherUser.id) && c.participants.includes(user.uid)
    );
    if (existingConv) {
      setActiveConv(existingConv);
      setShowNew(false);
      return;
    }
    const convRef = await addDoc(collection(db, "conversations"), {
      participants: [user.uid, otherUser.id],
      participantNames: {
        [user.uid]: username,
        [otherUser.id]: otherUser.username
      },
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastSenderId: ""
    });
    const newConv: Conversation = {
      id: convRef.id,
      participants: [user.uid, otherUser.id],
      participantNames: { [user.uid]: username, [otherUser.id]: otherUser.username },
      lastMessage: "",
      lastMessageTime: null,
      lastSenderId: ""
    };
    setActiveConv(newConv);
    setShowNew(false);
    setSearchUser("");
    setSearchResults([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !user) return;
    const text = input.trim();
    setInput("");
    await addDoc(collection(db, "conversations", activeConv.id, "messages"), {
      text, senderId: user.uid, senderName: username,
      timestamp: serverTimestamp(), read: false,
      conversationId: activeConv.id
    });
    await updateDoc(doc(db, "conversations", activeConv.id), {
      lastMessage: text, lastMessageTime: serverTimestamp(), lastSenderId: user.uid
    });
  };

  const getOtherName = (conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== user?.uid) || "";
    return conv.participantNames?.[otherId] || "Unknown";
  };

  const getInitial = (name: string) => name?.[0]?.toUpperCase() || "?";

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate?.() || new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const bg = "#0f0f1a";
  const panel = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div style={{ height: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", display: "flex", overflow: "hidden" }}>

      {/* Sidebar — conversation list */}
      <div style={{ width: 300, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>💬 Messages</h2>
            <button onClick={() => setShowNew(true)} style={{
              width: 34, height: 34, borderRadius: "50%", border: "none",
              background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white",
              cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center"
            }}>+</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" as const }}>
          {conversations.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "40px 20px", fontSize: "0.85rem" }}>
              No conversations yet.<br />Press + to start one!
            </p>
          )}
          {conversations.map(conv => {
            const otherName = getOtherName(conv);
            const isActive = activeConv?.id === conv.id;
            const isUnread = conv.lastSenderId !== user?.uid && conv.lastMessage;
            return (
              <div key={conv.id} onClick={() => setActiveConv(conv)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer",
                  background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                  borderLeft: isActive ? "3px solid #7c3aed" : "3px solid transparent",
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#667eea,#764ba2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "1rem"
                }}>{getInitial(otherName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontWeight: isUnread ? 700 : 500, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{otherName}</p>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 6 }}>{formatTime(conv.lastMessageTime)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: isUnread ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.lastMessage || "No messages yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "rgba(255,255,255,0.2)" }}>
            <p style={{ fontSize: "3rem" }}>💬</p>
            <p style={{ fontSize: "1rem" }}>Select a conversation or start a new one</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.15)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {getInitial(getOtherName(activeConv))}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>{getOtherName(activeConv)}</p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>Student</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", marginTop: 40, fontSize: "0.9rem" }}>
                  No messages yet — say hi! 👋
                </p>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.uid;
                const showName = !isMe && (i === 0 || messages[i-1].senderId !== msg.senderId);
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {showName && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginBottom: 3, marginLeft: 4 }}>{msg.senderName}</span>}
                    <div style={{
                      maxWidth: "68%", padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMe ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.08)",
                      fontSize: "0.9rem", lineHeight: "1.5", wordBreak: "break-word" as const
                    }}>{msg.text}</div>
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, alignItems: "center" }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", padding: "10px 16px", outline: "none", fontSize: "0.9rem" }} />
              <button onClick={sendMessage} style={{
                width: 40, height: 40, borderRadius: "50%", border: "none",
                background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white",
                cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center"
              }}>➤</button>
            </div>
          </>
        )}
      </div>

      {/* New conversation modal */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 18px" }}>💬 New Message</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchUsers()}
                placeholder="Search by username..."
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "white", padding: "10px 14px", outline: "none", fontSize: "0.9rem" }} />
              <button onClick={searchUsers} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 600, cursor: "pointer" }}>
                {searching ? "..." : "Search"}
              </button>
            </div>

            {searchResults.length === 0 && searchUser && !searching && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>No users found</p>
            )}

            {searchResults.map((u: any) => (
              <div key={u.id} onClick={() => startConversation(u)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, cursor: "pointer", background: "rgba(255,255,255,0.04)", marginBottom: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  {getInitial(u.username)}
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{u.username}</p>
              </div>
            ))}

            <button onClick={() => { setShowNew(false); setSearchUser(""); setSearchResults([]); }}
              style={{ marginTop: 12, width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer", fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}