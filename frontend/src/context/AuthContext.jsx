import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);
const ACTIVE_CHILD_KEY = "ml_active_child";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [childProfiles, setChildProfiles] = useState([]);
  const [activeChild, setActiveChildState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_CHILD_KEY) || "null"); } catch (_e) { return null; }
  });

  const setActiveChild = (profile) => {
    setActiveChildState(profile);
    if (profile) localStorage.setItem(ACTIVE_CHILD_KEY, JSON.stringify(profile));
    else localStorage.removeItem(ACTIVE_CHILD_KEY);
  };

  const loadChildProfiles = useCallback(async () => {
    try {
      const r = await api.get("/child-profiles");
      const list = r.data || [];
      setChildProfiles(list);
      // If no active child but profiles exist, activate first one
      if (!activeChild && list.length > 0) {
        setActiveChild(list[0]);
      }
      // If active child was deleted, clear
      if (activeChild && !list.find((p) => p.profile_id === activeChild.profile_id)) {
        setActiveChild(list[0] || null);
      } else if (activeChild) {
        // Refresh active child data if it changed on server
        const fresh = list.find((p) => p.profile_id === activeChild.profile_id);
        if (fresh) setActiveChild(fresh);
      }
    } catch (_e) { /* ignore */ }
  }, [activeChild]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (_e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) { setLoading(false); return; }
    checkAuth();
  }, [checkAuth]);

  // Load child profiles once authenticated
  useEffect(() => {
    if (user) loadChildProfiles();
    else { setChildProfiles([]); setActiveChild(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_e) { /* ignore */ }
    setUser(null);
    setActiveChild(null);
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, loading, checkAuth, logout,
      childProfiles, loadChildProfiles, activeChild, setActiveChild,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
