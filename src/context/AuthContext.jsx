import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile, updateUserTheme } from '../firebase/auth';

const AuthContext = createContext(null);

function normalizeTheme(t) {
  if (t === 'dark') return 'midnight';
  if (t === 'light') return 'dawn';
  if (t === 'midnight' || t === 'dawn' || t === 'forest' || t === 'ember') return t;
  return 'midnight';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = useCallback((theme) => {
    document.documentElement.setAttribute('data-theme', normalizeTheme(theme));
  }, []);

  useEffect(() => {
    applyTheme(profile?.theme);
  }, [profile?.theme, applyTheme]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        const normalized = p ? { ...p, theme: normalizeTheme(p.theme) } : null;
        setProfile(normalized);
        applyTheme(normalized?.theme);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, [applyTheme]);

  async function setTheme(theme) {
    if (!user) return;
    const normalized = normalizeTheme(theme);
    setProfile(prev => ({ ...prev, theme: normalized }));
    applyTheme(normalized);
    await updateUserTheme(user.uid, normalized);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
