import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, provider, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";


interface AuthContextType {
  user: User | null;
  username: string | null;
  login: () => void;
  logout: () => void;
  setUsername: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setUsernameState(snap.data().username);
      }
    });
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const setUsername = async (name: string) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { username: name, uid: user.uid });
    setUsernameState(name);
  };

  return (
    <AuthContext.Provider value={{ user, username, login, logout, setUsername }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;