import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserResults, getUserAccuracy, getUserLongestStreak } from '../../firebase/firestore';
import { logoutUser, updateUserDisplayName } from '../../firebase/auth';
import { ChevronLeft, LogOut, Flame, Target, Zap, Pencil, CheckCircle, Eye, EyeOff } from 'lucide-react';
import './Profile.css';

const THEMES = [
  { id: 'midnight', label: 'Midnight', desc: 'Deep indigo · easy on the eyes', colors: ['hsl(230 75% 60%)', 'hsl(230 30% 10%)', 'hsl(230 30% 6%)'] },
  { id: 'dawn', label: 'Dawn', desc: 'Warm sand · soft and bright', colors: ['hsl(15 80% 52%)', 'hsl(40 12% 88%)', 'hsl(40 18% 93%)'] },
  { id: 'forest', label: 'Forest', desc: 'Pine green · calm and natural', colors: ['hsl(160 75% 45%)', 'hsl(150 18% 15%)', 'hsl(150 25% 7%)'] },
  { id: 'ember', label: 'Ember', desc: 'Sunset glow · warm and luxurious', colors: ['hsl(22 85% 54%)', 'hsl(18 18% 11%)', 'hsl(18 22% 7%)'] },
];

function RecapCard({ answer, onDismiss, hintsOn }) {
  const [tapResult, setTapResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const cardRef = useRef(null);
  const startX = useRef(0);
  const isCorrectAnim = tapResult === 'correct';
  const isWrongAnim = tapResult === 'wrong';
  const isSwiping = dragging || Math.abs(offsetX) > 10;
  const options = answer.options || [];

  const handleStart = useCallback((clientX) => {
    if (isCorrectAnim) return;
    startX.current = clientX;
    setDragging(true);
  }, [isCorrectAnim]);

  const handleMove = useCallback((clientX) => {
    if (!dragging || isCorrectAnim) return;
    setOffsetX(clientX - startX.current);
  }, [dragging, isCorrectAnim]);

  const handleEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(offsetX) > 120) {
      onDismiss();
    } else {
      setOffsetX(0);
    }
  }, [dragging, offsetX, onDismiss]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onTouchStart = (e) => handleStart(e.touches[0].clientX);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();
    const onMouseDown = (e) => handleStart(e.clientX);
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleStart, handleMove, handleEnd]);

  function handleOptionClick(opt) {
    if (isCorrectAnim || isWrongAnim) return;
    if (answer.correct.includes(opt)) {
      setTapResult('correct');
      setTimeout(() => { setTapResult(null); onDismiss(); }, 700);
    } else {
      setTapResult('wrong');
      setTimeout(() => setTapResult(null), 500);
    }
  }

  const cardClass = [
    'review-card',
    'glass',
    isCorrectAnim ? 'card-correct' : '',
    isWrongAnim ? 'card-wrong' : '',
    isSwiping ? 'card-swiping' : '',
  ].filter(Boolean).join(' ');

  const cardStyle = isSwiping ? {
    transform: `translateX(${offsetX}px) rotate(${offsetX * 0.05}deg)`,
    opacity: Math.max(0, 1 - Math.abs(offsetX) / 400),
  } : {};

  return (
    <div className="review-card-wrap">
      <div ref={cardRef} className={cardClass} style={cardStyle}>
        <div className="q-number">Review</div>
        <p className="q-text">{answer.question}</p>
        <div className="options-list">
          {options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const wasSelected = answer.selected.includes(opt);
            const isCorrectOpt = answer.correct.includes(opt);
            const isTapped = tapResult && opt === (answer.correct.includes(opt)
              ? answer.correct.find(c => options.includes(c))
              : opt);
            let optClass = 'option-btn';
            if (!tapResult) {
              if (wasSelected && !isCorrectOpt) optClass += ' incorrect-dim';
              else if (hintsOn && isCorrectOpt) optClass += ' correct-hint';
            }
            if (isCorrectOpt && tapResult === 'correct') optClass += ' correct';
            if (tapResult === 'wrong' && opt === tapResult) optClass += ' incorrect';
            return (
              <button key={i} className={optClass}
                onClick={() => handleOptionClick(opt)}
                disabled={!!tapResult}
              >
                <span className="opt-letter">{letter}</span>
                <span className="opt-text">{opt}</span>
                {tapResult === 'correct' && isCorrectOpt && <CheckCircle size={18} className="opt-ic-correct"/>}
                {tapResult === 'wrong' && opt === (answer.correct.includes(opt) ? answer.correct.find(c => options.includes(c)) : opt) && <span className="opt-x">✕</span>}
              </button>
            );
          })}
        </div>
      </div>
      {!isCorrectAnim && (
        <div className="swipe-hint">← swipe to dismiss →</div>
      )}
    </div>
  );
}

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

  const reviewCards = [];
  const seen = new Set();
  for (const r of results) {
    const ans = r.answers || [];
    for (const a of ans) {
      if (!a.isCorrect && !seen.has(a.question)) {
        seen.add(a.question);
        reviewCards.push(a);
      }
    }
  }

  const [dismissed, setDismissed] = useState(new Set());
  const [hintsOn, setHintsOn] = useState(true);

  function handleDismiss(idx) {
    setDismissed(prev => new Set([...prev, idx]));
  }

  const activeCards = reviewCards.filter((_, i) => !dismissed.has(i));

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

        <div className="profile-stats">
          <div className="pstat glass"><Zap size={20} className="ps-icon purple"/><div className="ps-val">{profile?.totalQuizzes ?? 0}</div><div className="ps-lbl">Quizzes</div></div>
          <div className="pstat glass"><Target size={20} className="ps-icon blue"/><div className="ps-val">{accuracy !== null ? `${accuracy}%` : '—'}</div><div className="ps-lbl">Accuracy</div></div>
          <div className="pstat glass"><Flame size={20} className="ps-icon gold"/><div className="ps-val">{profile?.longestStreak ?? longestStreak}</div><div className="ps-lbl">Best Streak</div></div>
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
          <div className="appearance-corners-label">Corners</div>
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

        <div className="review-section">
          <h3 className="review-title">
            Recap
            {activeCards.length > 0 && <span className="review-count">{activeCards.length}</span>}
            <button className="hints-toggle" onClick={() => setHintsOn(h => !h)} title={hintsOn ? 'Hide hints' : 'Show hints'}>
              {hintsOn ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </h3>
          {loading ? <div className="p-loading">Loading…</div> : (
            activeCards.length === 0 ? (
              <p className="empty-hist">No questions to recap. Great job!</p>
            ) : (
              <RecapCard
                key={activeCards[0].question}
                answer={activeCards[0]}
                hintsOn={hintsOn}
                onDismiss={() => handleDismiss(reviewCards.indexOf(activeCards[0]))}
              />
            )
          )}
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-accent modal-accent--danger" />
            <div className="modal-body">
              <div className="modal-icon modal-icon--danger"><LogOut size={22} /></div>
              <h3 className="modal-title">Sign out?</h3>
              <p className="modal-desc">You'll need to sign in again to access your quizzes and stats.</p>
              <div className="modal-actions">
                <button className="btn-nav" onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button className="btn-submit" onClick={confirmLogout}>Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
