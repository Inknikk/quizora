import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserResults, getUserAccuracy, getUserLongestStreak } from '../../firebase/firestore';
import { logoutUser, updateUserDisplayName } from '../../firebase/auth';
import { ChevronLeft, LogOut, Flame, Target, Zap, Pencil } from 'lucide-react';
import './Profile.css';

const THEMES = [
  { id: 'midnight', label: 'Midnight', desc: 'Deep indigo · easy on the eyes', colors: ['hsl(230 75% 60%)', 'hsl(230 30% 10%)', 'hsl(230 30% 6%)'] },
  { id: 'dawn', label: 'Dawn', desc: 'Warm sand · soft and bright', colors: ['hsl(15 80% 52%)', 'hsl(40 12% 88%)', 'hsl(40 18% 93%)'] },
  { id: 'forest', label: 'Forest', desc: 'Pine green · calm and natural', colors: ['hsl(160 75% 45%)', 'hsl(150 18% 15%)', 'hsl(150 25% 7%)'] },
  { id: 'ember', label: 'Ember', desc: 'Sunset glow · warm and luxurious', colors: ['hsl(22 85% 54%)', 'hsl(18 18% 11%)', 'hsl(18 22% 7%)'] },
];

export default function Profile() {
  const { user, profile, setTheme, setCorners, setProfile } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState(null);
  const [longestStreak, setLongestStreak] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  async function handleSaveName() {
    const trimmed = editName.trim();
    if (!trimmed || !user) return;
    await updateUserDisplayName(user.uid, trimmed);
    setProfile(prev => ({ ...prev, displayName: trimmed }));
    setEditingName(false);
  }

  useEffect(() => {
    if (user) {
      getUserResults(user.uid).then(r => { setResults(r); setLoading(false); }).catch(() => setLoading(false));
      getUserAccuracy(user.uid).then(a => {
        if (a.totalQuestions > 0) {
          setAccuracy(Math.min(100, Math.round((a.totalCorrect / a.totalQuestions) * 100)));
        }
      });
      getUserLongestStreak(user.uid).then(s => setLongestStreak(s ?? 0)).catch(() => setLongestStreak(0));
    }
  }, [user]);

  function handleLogoutClick() { setShowLogoutModal(true); }

  async function confirmLogout() {
    setShowLogoutModal(false);
    await logoutUser();
    navigate('/auth');
  }

  const displayName = profile?.displayName || user?.displayName || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <div className="profile-page">
      <div className="profile-bg"/>
      <div className="profile-container">
        <div className="profile-topbar glass">
          <button className="icon-btn" onClick={() => navigate('/')}><ChevronLeft size={20}/></button>
          <h2>My Profile</h2>
          <button className="icon-btn" onClick={handleLogoutClick}><LogOut size={20}/></button>
        </div>

        <div className="profile-hero glass">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="avatar-img" referrerPolicy="no-referrer" />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          <div className="profile-name-row">
            {editingName ? (
              <input className="name-input" type="text" value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                onBlur={handleSaveName} autoFocus />
            ) : (
              <>
                <span className="profile-name">{profile?.displayName || user?.displayName || 'User'}</span>
                <button className="icon-btn icon-btn--sm" onClick={() => { setEditName(displayName); setEditingName(true); }}>
                  <Pencil size={14}/>
                </button>
              </>
            )}
          </div>
          <div className="profile-email">{user?.email}</div>
        </div>

        <div className="appearance-section">
          <h3>Appearance</h3>
          <div className="appearance-themes">
            {THEMES.map(t => {
              const active = profile?.theme === t.id;
              return (
                <button key={t.id} className={`app-theme ${active ? 'active' : ''}`} onClick={() => setTheme(t.id)}>
                  <div className="app-swatch">
                    {t.colors.map((c, i) => <span key={i} className="app-bar" style={{ background: c }}/>)}
                  </div>
                  <span className="app-label">{t.label}</span>
                  {active && <span className="app-check">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="appearance-corners">
            <button className={`app-corner ${profile?.corners !== 'square' ? 'active' : ''}`} onClick={() => setCorners('rounded')}>
              <span className="app-corner-dots rounded-preview">◉◉◉</span>
              <span className="app-label">Rounded</span>
              {profile?.corners !== 'square' && <span className="app-check">✓</span>}
            </button>
            <button className={`app-corner ${profile?.corners === 'square' ? 'active' : ''}`} onClick={() => setCorners('square')}>
              <span className="app-corner-dots square-preview">◻◻◻</span>
              <span className="app-label">Straight</span>
              {profile?.corners === 'square' && <span className="app-check">✓</span>}
            </button>
          </div>
        </div>

        <div className="profile-stats">
          <div className="pstat glass"><Zap size={20} className="ps-icon purple"/><div className="ps-val">{profile?.totalQuizzes ?? 0}</div><div className="ps-lbl">Quizzes</div></div>
          <div className="pstat glass"><Target size={20} className="ps-icon blue"/><div className="ps-val">{accuracy !== null ? `${accuracy}%` : '—'}</div><div className="ps-lbl">Accuracy</div></div>
          <div className="pstat glass"><Flame size={20} className="ps-icon gold"/><div className="ps-val">{profile?.longestStreak ?? longestStreak}</div><div className="ps-lbl">Best Streak</div></div>
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

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-box glass" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Sign out?</h3>
            <p className="modal-desc">You'll need to sign in again to access your quizzes and stats.</p>
            <div className="modal-actions">
              <button className="btn-nav" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="btn-submit" onClick={confirmLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
