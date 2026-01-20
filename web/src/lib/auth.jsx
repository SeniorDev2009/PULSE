import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", { token })
      .then((d) => setUser(d.user))
      .catch(() => {
        setUser(null);
        setToken("");
        localStorage.removeItem("token");
      });
  }, [token]);

  const value = useMemo(() => ({
    user,
    token,
    async login(email, password) {
      const d = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setUser(d.user);
      setToken(d.token);
      localStorage.setItem("token", d.token);
    },
    async register(payload) {
      const d = await api("/api/auth/register", { method: "POST", body: payload });
      setUser(d.user);
      setToken(d.token);
      localStorage.setItem("token", d.token);
    },
    async logout() {
      await api("/api/auth/logout", { method: "POST" }).catch(() => {});
      setUser(null);
      setToken("");
      localStorage.removeItem("token");
    }
  }), [user, token]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
