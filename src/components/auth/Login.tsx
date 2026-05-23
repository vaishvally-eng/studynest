import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}>
      <h1 style={{ color: "white", fontSize: "3rem", marginBottom: "0.5rem" }}>
        📚 StudyNest
      </h1>
      <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2rem" }}>
        Your dreamy study companion
      </p>
      <button onClick={login} style={{
        padding: "12px 32px",
        fontSize: "1rem",
        borderRadius: "50px",
        border: "none",
        background: "white",
        color: "#764ba2",
        fontWeight: "bold",
        cursor: "pointer",
      }}>
        Sign in with Google
      </button>
    </div>
  );
}