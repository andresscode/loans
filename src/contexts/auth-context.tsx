import { createContext, useContext, useState, type ReactNode } from "react";
import { authService, type User } from "@/services/auth";
import type { ActionResult } from "@/types";

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => ActionResult;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  function login(username: string, password: string) {
    const result = authService.login(username, password);
    if (result.success) {
      setUser(result.data);
      return { success: true } as ActionResult;
    }
    return result;
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext value={{ user, login, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
