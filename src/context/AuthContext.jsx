import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile, updateUserTheme, updateUserCorners } from '../firebase/auth';
import { AuthContext } from './authContext';

function normalizeTheme(t) {
  if (t === 'dark') return 'midnight';
  if (t === 'light') return 'dawn';
  if (t === 'midnight' || t === 'dawn' || t === 'forest' || t === 'ember') return t;
  return 'midnight';
}

function normalizeCorners(c) {
  return c === 'rounded' || c === 'square' ? c : 'rounded';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = useCallback((theme) => {
    document.documentElement.setAttribute('data-theme', normalizeTheme(theme));
  }, []);

  const applyCorners = useCallback((corners) => {
    document.documentElement.setAttribute('data-corners', normalizeCorners(corners));
  }, []);

  useEffect(() => {
    applyTheme(profile?.theme);
    applyCorners(profile?.corners);
  }, [profile?.theme, profile?.corners, applyTheme, applyCorners]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        const normalized = p ? { ...p, theme: normalizeTheme(p.theme), corners: normalizeCorners(p.corners) } : null;
        setProfile(normalized);
        applyTheme(normalized?.theme);
        applyCorners(normalized?.corners);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, [applyTheme, applyCorners]);

  async function setTheme(theme) {
    if (!user) return;
    const normalized = normalizeTheme(theme);
    setProfile(prev => ({ ...prev, theme: normalized }));
    applyTheme(normalized);
    await updateUserTheme(user.uid, normalized);
  }

  async function setCorners(corners) {
    if (!user) return;
    const normalized = normalizeCorners(corners);
    setProfile(prev => ({ ...prev, corners: normalized }));
    applyCorners(normalized);
    await updateUserCorners(user.uid, normalized);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, setTheme, setCorners }}>
      {children}
    </AuthContext.Provider>
  );
}
