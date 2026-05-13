import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserResults } from '../../firebase/firestore';
import { logoutUser } from '../../firebase/auth';
import { ChevronLeft, LogOut, Trophy, Target, Zap } from 'lucide-react';
import './Profile.css';

const THEMES = [
  { id: 'midnight', label: 'Midnight', desc: 'Deep indigo · easy on the eyes', colors: ['hsl(230 75% 60%)', 'hsl(230 30% 10%)', 'hsl(230 30% 6%)'] },
  { id: 'dawn', label: 'Dawn', desc: 'Warm sand · soft and bright', colors: ['hsl(15 80% 52%)', 'hsl(40 12% 88%)', 'hsl(40 18% 93%)'] },
  { id: 'forest', label: 'Forest', desc: 'Pine green · calm and natural', colors: ['hsl(160 75% 45%)', 'hsl(150 18% 15%)', 'hsl(150 25% 7%)'] },
  { id: 'ember', label: 'Ember', desc: 'Sunset glow · warm and luxurious', colors: ['hsl(22 85% 54%)', 'hsl(18 18% 11%)', 'hsl(18 22% 7%)'] },
];

export default function Profile() {
  const { user, profile, setTheme } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      getUserResults(user.uid).then(r => { setResults(r); setLoading(false); });
    }
  }, [user]);

  async function handleLogout() {
    await logoutUser();
    navigate('/auth');
  }

  const resultsAccuracy = (() => {
    let totalCorrect = 0, totalQuestions = 0;
    results.forEach(r => { totalCorrect += r.score || 0; totalQuestions += r.total || 0; });
    return totalQuestions > 0 ? Math.min(100, Math.round((totalCorrect / totalQuestions) * 100)) : null;
  })();

  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <div className="profile-page">
      <div className="profile-bg"/>
      <div className="profile-container">
        <div className="profile-topbar glass">
          <button className="icon-btn" onClick={() => navigate('/')}><ChevronLeft size={20}/></button>
          <h2>My Profile</h2>
          <button className="icon-btn" onClick={handleLogout}><LogOut size={20}/></button>
        </div>

        <div className="profile-hero glass">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="avatar-img" referrerPolicy="no-referrer" />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          <div className="profile-name">{user?.displayName || 'User'}</div>
          <div className="profile-email">{user?.email}</div>
        </div>

        <div className="theme-section">
          <h3>Theme</h3>
          <div className="theme-grid">
            {THEMES.map(t => {
              const active = profile?.theme === t.id;
              return (
                <button key={t.id} className={`theme-card ${active ? 'active' : ''}`} onClick={() => setTheme(t.id)}>
                  <div className="theme-swatch">
                    {t.colors.map((c, i) => <span key={i} className="swatch-bar" style={{ background: c }}/>)}
                  </div>
                  <div className="theme-info">
                    <div className="theme-name">{t.label}</div>
                    <div className="theme-desc">{t.desc}</div>
                  </div>
                  {active && <div className="theme-check">✓</div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="profile-stats">
          <div className="pstat glass"><Zap size={20} className="ps-icon purple"/><div className="ps-val">{results.length}</div><div className="ps-lbl">Quizzes</div></div>
          <div className="pstat glass"><Target size={20} className="ps-icon blue"/><div className="ps-val">{resultsAccuracy !== null ? `${resultsAccuracy}%` : '—'}</div><div className="ps-lbl">Accuracy</div></div>
          <div className="pstat glass"><Trophy size={20} className="ps-icon gold"/><div className="ps-val">{results.reduce((s, r) => s + (r.score||0), 0)}</div><div className="ps-lbl">Correct</div></div>
        </div>

        <h3 className="history-title">Recent Results</h3>
        {loading ? <div className="p-loading">Loading…</div> : (
          <div className="history-list">
            {results.length === 0 && <p className="empty-hist">No quizzes taken yet. Start one!</p>}
            {results.map(r => {
              const d = r.completedAt?.toDate?.();
              const dateStr = d ? d.toLocaleDateString() : '';
              const pct = r.percentage;
              const col = pct >= 85 ? 'green' : pct >= 70 ? 'blue' : pct >= 50 ? 'yellow' : 'red';
              return (
                <div key={r.id} className="history-card glass">
                  <div className="hc-left">
                    <div className="hc-title">{r.bankId}</div>
                    <div className="hc-date">{dateStr}</div>
                  </div>
                  <div className={`hc-score score-${col}`}>{pct}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
