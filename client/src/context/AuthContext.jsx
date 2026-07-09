import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lm_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("lm_token"))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ token, user }) => {
    localStorage.setItem("lm_token", token);
    setUser(user);
  };

  const login = async (email, password) => {
    const data = await api.post("/auth/login", { email, password }, { auth: false });
    saveSession(data);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.post("/auth/register", payload, { auth: false });
    saveSession(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("lm_token");
    setUser(null);
  };

  const refreshUser = async () => {
    const data = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
