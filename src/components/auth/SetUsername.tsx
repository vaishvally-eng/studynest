import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function SetUsername() {
  const { setUsername } = useAuth();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (input.trim().length < 3) {
      setError("Username must be at least 3 characters!");
      return;
    }
    try {
      await setUsername(input.trim());
    } catch (err) {
      setError("Something went wrong — please try again.");
      console.error(err);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}>
      <h1 style={{ color: "white", fontSize: "2rem", marginBottom: "0.5rem" }}>
        Welcome to StudyNest! 🌸
      </h1>
      <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2rem" }}>
        Pick a username — this will be your identity!
      </p>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter username..."
        style={{
          padding: "12px 20px",
          borderRadius: "50px",
          border: "none",
          fontSize: "1rem",
          marginBottom: "1rem",
          width: "280px",
          textAlign: "center",
        }}
      />
      {error && <p style={{ color: "#ffcccc", marginBottom: "1rem" }}>{error}</p>}
      <button onClick={handleSubmit} style={{
        padding: "12px 32px",
        fontSize: "1rem",
        borderRadius: "50px",
        border: "none",
        background: "white",
        color: "#764ba2",
        fontWeight: "bold",
        cursor: "pointer",
      }}>
        Set Username
      </button>
    </div>
  );
}import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function SetUsername() {
  const { setUsername } = useAuth();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (input.trim().length < 3) {
      setError("Username must be at least 3 characters!");
      return;
    }
    try {
      await setUsername(input.trim());
    } catch (err) {
      setError("Something went wrong — please try again.");
      console.error(err);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}>
      <h1 style={{ color: "white", fontSize: "2rem", marginBottom: "0.5rem" }}>
        Welcome to StudyNest! 🌸
      </h1>
      <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2rem" }}>
        Pick a username — this will be your identity!
      </p>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter username..."
        style={{
          padding: "12px 20px",
          borderRadius: "50px",
          border: "none",
          fontSize: "1rem",
          marginBottom: "1rem",
          width: "280px",
          textAlign: "center",
        }}
      />
      {error && <p style={{ color: "#ffcccc", marginBottom: "1rem" }}>{error}</p>}
      <button onClick={handleSubmit} style={{
        padding: "12px 32px",
        fontSize: "1rem",
        borderRadius: "50px",
        border: "none",
        background: "white",
        color: "#764ba2",
        fontWeight: "bold",
        cursor: "pointer",
      }}>
        Set Username
      </button>
    </div>
  );
}
