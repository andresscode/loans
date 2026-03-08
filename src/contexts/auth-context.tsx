import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authService } from "@/services/auth";
import type { ActionResult, User } from "@/types";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isFirstLaunch: boolean;
  login: (username: string, password: string) => Promise<ActionResult>;
  setup: (username: string, password: string, displayName: string) => Promise<ActionResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const hasUsers = await authService.hasUsers();
        if (!hasUsers) {
          setIsFirstLaunch(true);
          setIsLoading(false);
          return;
        }

        const result = await authService.validateSession();
        if (result.success) {
          setUser(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function login(username: string, password: string): Promise<ActionResult> {
    const result = await authService.login(username, password);
    if (result.success) {
      setUser(result.data.user);
      authService.saveToken(result.data.token);
      return { success: true };
    }
    return result;
  }

  async function setup(username: string, password: string, displayName: string): Promise<ActionResult> {
    const result = await authService.setup(username, password, displayName);
    if (result.success) {
      // After setup, log in to get a session token
      const loginResult = await authService.login(username, password);
      if (loginResult.success) {
        setUser(loginResult.data.user);
        authService.saveToken(loginResult.data.token);
        setIsFirstLaunch(false);
        return { success: true };
      }
      return loginResult;
    }
    return result;
  }

  function logout() {
    setUser(null);
    authService.clearToken();
  }

  return (
    <AuthContext value={{ user, isLoading, isFirstLaunch, login, setup, logout }}>
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
