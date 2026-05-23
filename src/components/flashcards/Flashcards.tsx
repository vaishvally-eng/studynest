import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, where, updateDoc, orderBy
} from "firebase/firestore";

interface Card {
  id: string;
  front: string;
  back: string;
  known: boolean;
}

interface Deck {
  id: string;
  name: string;
  emoji: string;
  color: string;
  cards: Card[];
  uid: string;
  createdAt: number;
}

const COLORS = ["#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa","#f87171","#818cf8","#fb923c"];
const EMOJIS = ["📚","🇫🇷","🧪","📐","🌍","💡","🎯","🧠","✏️","🔬","📖","🎵"];

export default function Flashcards() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [view, setView] = useState<"decks" | "cards" | "study">("decks");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);

  // Deck form
  const [deckName, setDeckName] = useState("");
  const [deckEmoji, setDeckEmoji] = useState("📚");
  const [deckColor, setDeckColor] = useState("#a78bfa");

  // Card form
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  // Study mode
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [studyDone, setStudyDone] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "decks"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, snap =>
      setDecks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deck)))
    );
  }, [user]);

  const saveDeck = async () => {
    if (!deckName.trim() || !user) return;
    await addDoc(collection(db, "decks"), {
      name: deckName.trim(), emoji: deckEmoji, color: deckColor,
      cards: [], uid: user.uid, createdAt: Date.now()
    });
    setDeckName(""); setDeckEmoji("📚"); setDeckColor("#a78bfa");
    setShowDeckForm(false);
  };

  const deleteDeck = async (id: string) => {
    await deleteDoc(doc(db, "decks", id));
    setView("decks"); setActiveDeck(null);
  };

  const addCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;
    const newCard: Card = {
      id: Date.now().toString(),
      front: cardFront.trim(),
      back: cardBack.trim(),
      known: false
    };
    const updatedCards = [...activeDeck.cards, newCard];
    await updateDoc(doc(db, "decks", activeDeck.id), { cards: updatedCards });
    setActiveDeck({ ...activeDeck, cards: updatedCards });
    setCardFront(""); setCardBack("");
    setShowCardForm(false);
  };

  const deleteCard = async (cardId: string) => {
    if (!activeDeck) return;
    const updatedCards = activeDeck.cards.filter(c => c.id !== cardId);
    await updateDoc(doc(db, "decks", activeDeck.id), { cards: updatedCards });
    setActiveDeck({ ...activeDeck, cards: updatedCards });
  };

  const startStudy = (deck: Deck) => {
    const cards = [...deck.cards].sort(() => Math.random() - 0.5);
    setStudyCards(cards);
    setStudyIndex(0);
    setFlipped(false);
    setStudyDone(false);
    setKnownCount(0);
    setActiveDeck(deck);
    setView("study");
  };

  const handleKnown = async (known: boolean) => {
    if (!activeDeck) return;
    if (known) setKnownCount(k => k + 1);
    const updatedCards = activeDeck.cards.map(c =>
      c.id === studyCards[studyIndex].id ? { ...c, known } : c
    );
    await updateDoc(doc(db, "decks", activeDeck.id), { cards: updatedCards });

    if (studyIndex + 1 >= studyCards.length) {
      setStudyDone(true);
    } else {
      setStudyIndex(i => i + 1);
      setFlipped(false);
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
    padding: "8px 20px", borderRadius: 10, border: "none", fontSize: "0.85rem",
    fontWeight: 600 as const, cursor: "pointer",
    background: danger ? "rgba(255,100,100,0.2)" : active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.07)",
    color: danger ? "#f87171" : "white"
  });

  // STUDY MODE
  if (view === "study") {
    const card = studyCards[studyIndex];
    return (
      <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <button onClick={() => { setView("cards"); }} style={btn()}>← Back</button>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
              {activeDeck?.emoji} {activeDeck?.name}
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
              {studyIndex + 1} / {studyCards.length}
            </p>
          </div>

          {studyDone ? (
            <div style={{ ...panel, padding: "60px 40px", textAlign: "center" }}>
              <p style={{ fontSize: "3rem", margin: "0 0 16px" }}>🎉</p>
              <h2 style={{ margin: "0 0 8px" }}>Session Complete!</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 28px" }}>
                You knew <strong style={{ color: "#6ee7b7" }}>{knownCount}</strong> out of <strong>{studyCards.length}</strong> cards
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={() => startStudy(activeDeck!)} style={btn(true)}>Study Again 🔄</button>
                <button onClick={() => setView("cards")} style={btn()}>Back to Deck</button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 28, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${((studyIndex) / studyCards.length) * 100}%`, background: activeDeck?.color || "#a78bfa", transition: "width 0.3s" }} />
              </div>

              {/* Flashcard */}
              <div onClick={() => setFlipped(f => !f)} style={{
                ...panel, padding: "60px 40px", textAlign: "center", cursor: "pointer",
                minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                borderColor: flipped ? (activeDeck?.color || "#a78bfa") + "66" : "rgba(255,255,255,0.08)",
                transition: "all 0.3s", marginBottom: 24,
                background: flipped ? `${activeDeck?.color || "#a78bfa"}11` : "rgba(255,255,255,0.04)"
              }}>
                <p style={{ margin: "0 0 12px", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {flipped ? "Answer" : "Question — tap to reveal"}
                </p>
                <p style={{ margin: 0, fontSize: "1.4rem", lineHeight: 1.6, fontWeight: flipped ? 700 : 400, color: flipped ? activeDeck?.color || "white" : "white" }}>
                  {flipped ? card?.back : card?.front}
                </p>
              </div>

              {flipped && (
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button onClick={() => handleKnown(false)} style={{ ...btn(false, true), padding: "12px 32px", fontSize: "1rem" }}>
                    ✗ Still learning
                  </button>
                  <button onClick={() => handleKnown(true)} style={{ padding: "12px 32px", borderRadius: 10, border: "none", fontSize: "1rem", fontWeight: 600, cursor: "pointer", background: "rgba(52,211,153,0.2)", color: "#34d399" }}>
                    ✓ Got it!
                  </button>
                </div>
              )}

              {!flipped && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.85rem" }}>Tap the card to see the answer</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // CARDS VIEW
  if (view === "cards" && activeDeck) {
    const knownCards = activeDeck.cards.filter(c => c.known).length;
    return (
      <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setView("decks")} style={btn()}>← Decks</button>
              <h2 style={{ margin: 0 }}>{activeDeck.emoji} {activeDeck.name}</h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowCardForm(true)} style={btn()}>+ Add Card</button>
              {activeDeck.cards.length > 0 && <button onClick={() => startStudy(activeDeck)} style={btn(true)}>▶ Study</button>}
              <button onClick={() => deleteDeck(activeDeck.id)} style={btn(false, true)}>🗑️</button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Cards", value: activeDeck.cards.length, color: activeDeck.color },
              { label: "Known", value: knownCards, color: "#34d399" },
              { label: "Learning", value: activeDeck.cards.length - knownCards, color: "#f87171" },
            ].map(s => (
              <div key={s.label} style={{ ...panel, padding: "14px 18px" }}>
                <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {activeDeck.cards.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 60, color: "rgba(255,255,255,0.2)" }}>
              <p style={{ fontSize: "3rem" }}>🃏</p>
              <p>No cards yet — add your first one!</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeDeck.cards.map((card, i) => (
              <div key={card.id} style={{ ...panel, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.2)", minWidth: 20 }}>#{i+1}</span>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Front</p>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>{card.front}</p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Back</p>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>{card.back}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.75rem", color: card.known ? "#34d399" : "#f87171" }}>{card.known ? "✓ Known" : "Learning"}</span>
                  <button onClick={() => deleteCard(card.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "1rem" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add card modal */}
        {showCardForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 460 }}>
              <h3 style={{ margin: "0 0 20px" }}>🃏 New Card</h3>
              <label style={{ display: "block", marginBottom: 14 }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Front (Question)</p>
                <textarea value={cardFront} onChange={e => setCardFront(e.target.value)}
                  placeholder="e.g. What is photosynthesis?"
                  style={{ ...inputStyle, minHeight: 80, resize: "none" }} autoFocus />
              </label>
              <label style={{ display: "block", marginBottom: 20 }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Back (Answer)</p>
                <textarea value={cardBack} onChange={e => setCardBack(e.target.value)}
                  placeholder="e.g. The process by which plants convert sunlight into energy..."
                  style={{ ...inputStyle, minHeight: 80, resize: "none" }} />
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setShowCardForm(false); setCardFront(""); setCardBack(""); }} style={btn()}>Cancel</button>
                <button onClick={addCard} style={btn(true)} disabled={!cardFront.trim() || !cardBack.trim()}>Add Card</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DECKS VIEW
  return (
    <div style={{ minHeight: "100vh", background: bg, color: "white", fontFamily: "'Segoe UI',sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>🃏 Flashcards</h1>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>{decks.length} decks</p>
          </div>
          <button onClick={() => setShowDeckForm(true)} style={btn(true)}>+ New Deck</button>
        </div>

        {decks.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 80, color: "rgba(255,255,255,0.2)" }}>
            <p style={{ fontSize: "3rem" }}>🃏</p>
            <p>No decks yet — create your first one!</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {decks.map(deck => {
            const known = deck.cards.filter(c => c.known).length;
            const pct = deck.cards.length > 0 ? Math.round((known / deck.cards.length) * 100) : 0;
            return (
              <div key={deck.id} onClick={() => { setActiveDeck(deck); setView("cards"); }}
                style={{ ...panel, padding: "22px 24px", cursor: "pointer", borderTop: `3px solid ${deck.color}`, transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>{deck.emoji}</div>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "1rem" }}>{deck.name}</p>
                <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{deck.cards.length} cards</p>

                {/* Progress bar */}
                <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: deck.color, transition: "width 0.3s" }} />
                </div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{pct}% known</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* New deck modal */}
      {showDeckForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}>
            <h3 style={{ margin: "0 0 20px" }}>📚 New Deck</h3>
            <label style={{ display: "block", marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Deck name *</p>
              <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="e.g. French Vocabulary, Biology Ch.3..." style={inputStyle} autoFocus />
            </label>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Emoji</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {EMOJIS.map(e => (
                  <span key={e} onClick={() => setDeckEmoji(e)} style={{ fontSize: "1.4rem", cursor: "pointer", padding: "4px 6px", borderRadius: 8,
                    background: deckEmoji === e ? "rgba(124,58,237,0.3)" : "transparent",
                    border: deckEmoji === e ? "1px solid #7c3aed" : "1px solid transparent" }}>{e}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Color</p>
              <div style={{ display: "flex", gap: 10 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setDeckColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                    border: deckColor === c ? "3px solid white" : "3px solid transparent" }} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowDeckForm(false); setDeckName(""); }} style={btn()}>Cancel</button>
              <button onClick={saveDeck} style={btn(true)} disabled={!deckName.trim()}>Create Deck</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}