import type { ActionResult } from "@/types";

export type User = {
  username: string;
};

export const authService = {
  login(username: string, password: string): ActionResult<User> {
    if (!username || !password) {
      return { success: false, error: "Usuario y contraseña son requeridos" };
    }
    return { success: true, data: { username } };
  },
};
