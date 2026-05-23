import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db, rtdb } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, getDocs, updateDoc, getDoc, setDoc, orderBy
} from "firebase/firestore";
import { ref, set, onValue, push, off } from "firebase/database";
import { useNavigate } from "react-router-dom";

interface FriendRequest {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

interface Friend {
  uid: string;
  username: string;
}

interface Message {
  uid: string;
  username: string;
  text: string;
  timestamp: number;
}

interface SharedNote {
  id: string;
  title: string;
  body?: string;
  canvasData?: string;
  type: "typed" | "handwritten";
  sharedBy: string;
  sharedByUid: string;
  sharedWith: string[];
  editable: boolean;
  createdAt: number;
}

export default function Friends() {
  const { user } = useAuth();
  const myUsername = (user as any)?.username || user?.displayName || user?.email?.split("@")[0] || "User";
  const navigate = useNavigate();

  const [view, setView] = useState<"list" | "chat" | "notes">("list");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{uid:string;username:string}|null>(null);
  const [searchError, setSearchError] = useState("");
  const [activeFriend, setActiveFriend] = useState<Friend|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<SharedNote|null>(null);
  const [noteBody, setNoteBody] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#a78bfa");
  const [penSize, setPenSize] = useState(3);
  const lastPos = useRef<{x:number;y:number}|null>(null);

  // Load friends
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "friends"), where("users", "array-contains", user.uid));
    return onSnapshot(q, snap => {
      const f = snap.docs.map(d => {
        const data = d.data();
        const otherUid = data.users.find((u: string) => u !== user.uid);
        const otherUsername = data.usernames[otherUid];
        return { uid: otherUid, username: otherUsername };
      });
      setFriends(f);
    });
  }, [user]);

  // Load friend requests
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "friendRequests"), where("toUid", "==", user.uid), where("status", "==", "pending"));
    return onSnapshot(q, snap => setRequests(snap.docs.map(d => ({id:d.id,...d.data()} as FriendRequest))));
  }, [user]);

  // Load chat messages
  useEffect(() => {
    if (!activeFriend) return;
    const chatId = [user!.uid, activeFriend.uid].sort().join("_");
    const msgRef = ref(rtdb, `chats/${chatId}`);
    onValue(msgRef, snap => {
      const data = snap.val();
      setMessages(data ? Object.values(data) : []);
    });
    return () => off(msgRef);
  }, [activeFriend]);

  // Load shared notes
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "sharedNotes"), where("sharedWith", "array-contains", user.uid));
    const q2 = query(collection(db, "sharedNotes"), where("sharedByUid", "==", user.uid));
    const unsub1 = onSnapshot(q, snap => {
      const n1 = snap.docs.map(d => ({id:d.id,...d.data()} as SharedNote));
      setSharedNotes(prev => {
        const ids = new Set(n1.map(n => n.id));
        return [...n1, ...prev.filter(n => !ids.has(n.id) && n.sharedByUid === user.uid)];
      });
    });
    return () => unsub1();
  }, [user]);

  // Load my notes to share
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "notes"), where("uid", "==", user.uid));
    return onSnapshot(q, snap => setMyNotes(snap.docs.map(d => ({id:d.id,...d.data()}))));
  }, [user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const searchUser = async () => {
    setSearchError(""); setSearchResult(null);
    if (!searchQuery.trim()) return;
    const q = query(collection(db, "users"), where("username", "==", searchQuery.trim()));
    const snap = await getDocs(q);
    if (snap.empty) { setSearchError("User not found!"); return; }
    const userData = snap.docs[0].data();
    if (userData.uid === user!.uid) { setSearchError("That's you!"); return; }
    const alreadyFriend = friends.some(f => f.uid === userData.uid);
    if (alreadyFriend) { setSearchError("Already friends!"); return; }
    setSearchResult({ uid: userData.uid, username: userData.username });
  };

  const sendRequest = async () => {
    if (!searchResult || !user) return;
    // Check if request already sent
    const q = query(collection(db, "friendRequests"),
      where("fromUid", "==", user.uid),
      where("toUid", "==", searchResult.uid),
      where("status", "==", "pending"));
    const snap = await getDocs(q);
    if (!snap.empty) { setSearchError("Request already sent!"); return; }
    await addDoc(collection(db, "friendRequests"), {
      fromUid: user.uid, fromUsername: myUsername,
      toUid: searchResult.uid, toUsername: searchResult.username,
      status: "pending", createdAt: Date.now()
    });
    setSearchResult(null); setSearchQuery("");
    alert("Friend request sent! 🌸");
  };

  const acceptRequest = async (req: FriendRequest) => {
    await updateDoc(doc(db, "friendRequests", req.id), { status: "accepted" });
    await addDoc(collection(db, "friends"), {
      users: [user!.uid, req.fromUid],
      usernames: { [user!.uid]: myUsername, [req.fromUid]: req.fromUsername },
      createdAt: Date.now()
    });
  };

  const declineRequest = async (req: FriendRequest) => {
    await updateDoc(doc(db, "friendRequests", req.id), { status: "declined" });
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeFriend) return;
    const chatId = [user!.uid, activeFriend.uid].sort().join("_");
    await push(ref(rtdb, `chats/${chatId}`), {
      uid: user!.uid, username: myUsername, text: chatInput.trim(), timestamp: Date.now()
    });
    setChatInput("");
  };

  const shareNote = async (note: any, friendUid: string, editable: boolean) => {
    await addDoc(collection(db, "sharedNotes"), {
      title: note.title, body: note.body || "",
      canvasData: note.canvasData || "", type: note.type,
      sharedBy: myUsername, sharedByUid: user!.uid,
      sharedWith: [friendUid], editable, createdAt: Date.now()
    });
    alert("Note shared! 🌸");
  };

  const openSharedNote = (note: SharedNote) => {
    setActiveNote(note);
    setNoteBody(note.body || "");
    setView("notes");
    if (note.type === "handwritten" && note.canvasData) {
      setTimeout(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const img = new Image();
        img.onload = () => canvas.getContext("2d")?.drawImage(img, 0, 0);
        img.src = note.canvasData!;
      }, 300);
    }
  };

  const saveSharedNote = async () => {
    if (!activeNote) return;
    const data: any = { body: noteBody };
    if (activeNote.type === "handwritten" && canvasRef.current) {
      data.canvasData = canvasRef.current.toDataURL();
    }
    await updateDoc(doc(db, "sharedNotes", activeNote.id), data);
    alert("Saved! ✅");
  };

  // Canvas drawing
  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e: React.MouseEvent) => { setDrawing(true); lastPos.current = getPos(e); };
  const draw = (e: React.MouseEvent) => {
    if (!drawing || !canvasRef.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y); ctx.lineTo(pos.x, pos.y);
    ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = penColor; ctx.lineWidth = penSize;
    ctx.lineCap = "round"; ctx.stroke();
    lastPos.current = pos;
  };
  const stopDraw = () => { setDrawing(false); lastPos.current = null; };

  const bg = "linear-gradient(135deg,#0f0f1a,#1a1a2e)";
  const panel = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px" };
  const btn = (active=false, danger=false) => ({
    padding:"8px 16px", borderRadius:"10px", border:"none", fontSize:"0.83rem", fontWeight:"600" as const, cursor:"pointer",
    background: danger?"rgba(255,100,100,0.2)": active?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.07)",
    color: danger?"#f87171":"white"
  });

  // NOTE VIEW
  if (view === "notes" && activeNote) return (
    <div style={{minHeight:"100vh", background:bg, color:"white", fontFamily:"'Segoe UI',sans-serif", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.2)"}}>
        <button onClick={()=>setView("list")} style={btn()}>← Back</button>
        <div>
          <h3 style={{margin:0, fontSize:"1rem"}}>{activeNote.title}</h3>
          <p style={{margin:0, fontSize:"0.75rem", color:"rgba(255,255,255,0.4)"}}>Shared by {activeNote.sharedBy} • {activeNote.editable?"Editable":"View only"}</p>
        </div>
        {activeNote.editable && <button onClick={saveSharedNote} style={{...btn(true), marginLeft:"auto"}}>💾 Save</button>}
      </div>

      {activeNote.type === "typed" && (
        <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} disabled={!activeNote.editable}
          style={{flex:1, minHeight:"80vh", background:"rgba(255,255,255,0.02)", border:"none", color:"white", fontSize:"1rem", outline:"none", padding:"28px 36px", resize:"none", lineHeight:"1.9", fontFamily:"'Segoe UI',sans-serif",
            opacity: activeNote.editable ? 1 : 0.7}} />
      )}

      {activeNote.type === "handwritten" && (
        <div style={{flex:1, padding:"16px"}}>
          {activeNote.editable && (
            <div style={{display:"flex", gap:"8px", marginBottom:"12px", flexWrap:"wrap" as const}}>
              <input type="range" min={1} max={12} value={penSize} onChange={e=>setPenSize(+e.target.value)} style={{width:"70px", accentColor:"#a78bfa"}}/>
              {["#ffffff","#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa"].map(c=>(
                <div key={c} onClick={()=>setPenColor(c)} style={{width:"20px",height:"20px",borderRadius:"50%",background:c,cursor:"pointer",border:penColor===c?"2px solid white":"2px solid transparent"}}/>
              ))}
            </div>
          )}
          <canvas ref={canvasRef} width={1400} height={800}
            style={{width:"100%", background:"#1e1e2e", borderRadius:"12px", cursor: activeNote.editable?"crosshair":"default"}}
            onMouseDown={activeNote.editable ? startDraw : undefined}
            onMouseMove={activeNote.editable ? draw : undefined}
            onMouseUp={activeNote.editable ? stopDraw : undefined}
            onMouseLeave={activeNote.editable ? stopDraw : undefined}/>
        </div>
      )}
    </div>
  );

  // CHAT VIEW
  if (view === "chat" && activeFriend) return (
    <div style={{minHeight:"100vh", background:bg, color:"white", fontFamily:"'Segoe UI',sans-serif", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", gap:"14px", padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.2)"}}>
        <button onClick={()=>setView("list")} style={btn()}>←</button>
        <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>
          {activeFriend.username[0].toUpperCase()}
        </div>
        <div>
          <h3 style={{margin:0,fontSize:"1rem"}}>{activeFriend.username}</h3>
          <p style={{margin:0,fontSize:"0.75rem",color:"rgba(255,255,255,0.4)"}}>Friend</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"8px"}}>
          <button onClick={()=>{
            const myNote = myNotes[0];
            if (!myNote) { alert("You have no notes to share!"); return; }
            const editable = window.confirm("Allow friend to edit? (OK=Yes, Cancel=View only)");
            shareNote(myNote, activeFriend.uid, editable);
          }} style={btn()}>📤 Share a Note</button>
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto" as const, padding:"20px", display:"flex", flexDirection:"column", gap:"12px"}}>
        {messages.length===0 && <p style={{color:"rgba(255,255,255,0.2)",textAlign:"center",marginTop:"60px"}}>No messages yet. Say hi! 👋</p>}
        {[...messages].sort((a,b)=>a.timestamp-b.timestamp).map((msg,i)=>{
          const isMe = msg.uid === user!.uid;
          return (
            <div key={i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"65%",background:isMe?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.08)",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 14px"}}>
                {!isMe && <p style={{margin:"0 0 3px",fontSize:"0.75rem",color:"#a78bfa",fontWeight:"600"}}>{msg.username}</p>}
                <p style={{margin:0,fontSize:"0.9rem"}}>{msg.text}</p>
                <p style={{margin:"4px 0 0",fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",textAlign:"right"}}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef}/>
      </div>

      <div style={{padding:"14px 20px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:"10px"}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Type a message..."
          style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"12px",color:"white",padding:"10px 16px",outline:"none",fontSize:"0.9rem"}}/>
        <button onClick={sendMessage} style={{width:"40px",height:"40px",borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",cursor:"pointer",fontSize:"1rem"}}>➤</button>
      </div>
    </div>
  );

  // MAIN FRIENDS LIST VIEW
  return (
    <div style={{minHeight:"100vh",background:bg,color:"white",fontFamily:"'Segoe UI',sans-serif",padding:"32px"}}>
      <button onClick={()=>navigate("/")} style={{...btn(),marginBottom:"24px"}}>← Dashboard</button>
      <h1 style={{fontSize:"2.2rem",margin:"0 0 6px"}}>👥 Friends</h1>
      <p style={{color:"rgba(255,255,255,0.4)",marginBottom:"32px"}}>Connect, chat, and study together</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px",marginBottom:"32px"}}>
        {/* Search */}
        <div style={{...panel,padding:"24px"}}>
          <h3 style={{margin:"0 0 16px",fontSize:"1rem",color:"rgba(255,255,255,0.7)"}}>🔍 Find Friends</h3>
          <div style={{display:"flex",gap:"10px",marginBottom:"12px"}}>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUser()} placeholder="Search by username..."
              style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",color:"white",padding:"10px 14px",fontSize:"0.9rem",outline:"none"}}/>
            <button onClick={searchUser} style={btn(true)}>Search</button>
          </div>
          {searchError && <p style={{color:"#f87171",fontSize:"0.85rem",margin:"0 0 8px"}}>{searchError}</p>}
          {searchResult && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,0.06)",borderRadius:"12px",padding:"12px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>
                  {searchResult.username[0].toUpperCase()}
                </div>
                <span style={{fontWeight:"500"}}>{searchResult.username}</span>
              </div>
              <button onClick={sendRequest} style={btn(true)}>+ Add Friend</button>
            </div>
          )}
        </div>

        {/* Friend Requests */}
        <div style={{...panel,padding:"24px"}}>
          <h3 style={{margin:"0 0 16px",fontSize:"1rem",color:"rgba(255,255,255,0.7)"}}>📬 Friend Requests {requests.length>0&&<span style={{background:"#7c3aed",borderRadius:"50%",padding:"1px 7px",fontSize:"0.75rem",marginLeft:"6px"}}>{requests.length}</span>}</h3>
          {requests.length===0 && <p style={{color:"rgba(255,255,255,0.25)",fontSize:"0.85rem"}}>No pending requests</p>}
          {requests.map(req=>(
            <div key={req.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",background:"rgba(255,255,255,0.05)",borderRadius:"12px",padding:"10px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:"0.85rem"}}>
                  {req.fromUsername[0].toUpperCase()}
                </div>
                <span style={{fontSize:"0.9rem"}}>{req.fromUsername}</span>
              </div>
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={()=>acceptRequest(req)} style={btn(true)}>✓ Accept</button>
                <button onClick={()=>declineRequest(req)} style={btn(false,true)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Friends List */}
      <h3 style={{fontSize:"1rem",color:"rgba(255,255,255,0.5)",marginBottom:"14px",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Friends ({friends.length})</h3>
      {friends.length===0 && <p style={{color:"rgba(255,255,255,0.2)",fontSize:"0.9rem"}}>No friends yet — search and add some! 🌸</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"14px",marginBottom:"32px"}}>
        {friends.map(friend=>(
          <div key={friend.uid} style={{...panel,padding:"18px",display:"flex",alignItems:"center",gap:"14px"}}>
            <div style={{width:"44px",height:"44px",borderRadius:"50%",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:"1.1rem",flexShrink:0}}>
              {friend.username[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <p style={{margin:"0 0 10px",fontWeight:"600"}}>{friend.username}</p>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                <button onClick={()=>{setActiveFriend(friend);setView("chat");}} style={btn(true)}>💬 Chat</button>
                <button onClick={()=>{
                  if (myNotes.length===0) { alert("You have no notes to share!"); return; }
                  const noteTitles = myNotes.map((n,i)=>`${i+1}. ${n.title} (${n.type})`).join("\n");
                  const idx = parseInt(prompt(`Which note to share?\n${noteTitles}`)||"0")-1;
                  if (idx<0||idx>=myNotes.length) return;
                  const editable = window.confirm("Allow friend to edit?\nOK = Editable\nCancel = View only");
                  shareNote(myNotes[idx], friend.uid, editable);
                }} style={btn()}>📤 Share Note</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shared Notes */}
      <h3 style={{fontSize:"1rem",color:"rgba(255,255,255,0.5)",marginBottom:"14px",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>📝 Shared Notes</h3>
      {sharedNotes.length===0 && <p style={{color:"rgba(255,255,255,0.2)",fontSize:"0.9rem"}}>No shared notes yet</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"14px"}}>
        {sharedNotes.map(note=>(
          <div key={note.id} onClick={()=>openSharedNote(note)} style={{...panel,padding:"18px",cursor:"pointer"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.08)")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.04)")}>
            <p style={{margin:"0 0 6px",fontWeight:"600"}}>{note.type==="typed"?"✏️":"🖊️"} {note.title}</p>
            <p style={{margin:"0 0 8px",fontSize:"0.78rem",color:"rgba(255,255,255,0.35)"}}>From {note.sharedBy}</p>
            <span style={{fontSize:"0.75rem",padding:"3px 10px",borderRadius:"20px",background:note.editable?"rgba(110,231,183,0.15)":"rgba(255,255,255,0.08)",color:note.editable?"#6ee7b7":"rgba(255,255,255,0.4)"}}>
              {note.editable?"✏️ Editable":"👁 View only"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
