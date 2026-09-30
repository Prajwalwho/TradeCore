import { createContext, useContext, useState, type ReactNode } from "react";
import { isAuthenticated as checkAuth, clearTokens } from "../lib/api-client";
import { login as apiLogin, register as apiRegister } from "../lib/auth-api";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(checkAuth());

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    setAuthed(true);
  }

  async function register(email: string, password: string) {
    await apiRegister(email, password);
    await login(email, password); // register then log straight in, one less step for the user
  }

  function logout() {
    clearTokens();
    setAuthed(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: authed, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}