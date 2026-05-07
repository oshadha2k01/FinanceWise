import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { jwtDecode } from "jwt-decode";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";

interface User {
  uid: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refresh_token");
      
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded.exp * 1000 > Date.now()) {
            setUser({ uid: decoded.sub, email: decoded.email, name: decoded.name });
          } else if (refreshToken) {
            try {
              const { data } = await api.post("/api/auth/refresh", { refresh_token: refreshToken });
              localStorage.setItem("token", data.access_token);
              localStorage.setItem("refresh_token", data.refresh_token);
              const newDecoded: any = jwtDecode(data.access_token);
              setUser({ uid: newDecoded.sub, email: newDecoded.email, name: newDecoded.name });
            } catch (err) {
              localStorage.removeItem("token");
              localStorage.removeItem("refresh_token");
            }
          } else {
            localStorage.removeItem("token");
          }
        } catch (e) {
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    
    const { data } = await api.post("/api/auth/google", { token: idToken });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const decoded: any = jwtDecode(data.access_token);
    setUser({ uid: decoded.sub, email: decoded.email, name: decoded.name });
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const { data } = await api.post("/api/auth/login", { email, password: pass });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const decoded: any = jwtDecode(data.access_token);
    setUser({ uid: decoded.sub, email: decoded.email, name: decoded.name });
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const { data } = await api.post("/api/auth/register", { email, password: pass });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const decoded: any = jwtDecode(data.access_token);
    setUser({ uid: decoded.sub, email: decoded.email, name: decoded.name });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
