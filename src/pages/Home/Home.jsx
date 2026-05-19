import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getQuizBanks, getUserAccuracy, getUserLongestStreak, getUserResults } from '../../firebase/firestore';
import { logoutUser } from '../../firebase/auth';
import { Play, LogOut, User, Zap, Target, RefreshCw, ArrowRight, Flame, Layers, Eye, EyeOff } from 'lucide-react';
import RecapCard from './RecapCard';
import './Home.css';

const RAPID_SET_COUNT = 10;
const FULL_QUIZ_SIZE = 65;
const STORAGE_KEY = 'quizora_completed_rapid';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function allQuestions(banks) {
  return banks.flatMap(b => b.questions || []);
}

function loadCompleted() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveCompleted(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function useCounter(end) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (end == null) return;
    let raf;
    const start = performance.now();
    const duration = 900;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end]);
  return value;
}

function AnimatedStat({ value, suffix = '' }) {
  const n = useCounter(typeof value === 'number' ? value : 0);
  return <span className="stat-value">{n}{suffix}</span>;
}

export default function Home() {
  const { user, profile } = useAuth();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTarget, setQuizTarget] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [completedSetIds, setCompletedSetIds] = useState(loadCompleted);
  const [recapResults, setRecapResults] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [hintsOn, setHintsOn] = useState(true);
  const navigate = useNavigate();

  const refreshCompleted = useCallback(() => {
    setCompletedSetIds(loadCompleted());
  }, []);

  function promptQuiz(path, state) {
    setQuizTarget({ path, state });
    setShowQuizModal(true);
  }
  function confirmQuiz() {
    if (!quizTarget) return;
    setShowQuizModal(false);
    navigate(quizTarget.path, quizTarget.state ? { state: quizTarget.state } : {});
  }

  useEffect(() => {
    getQuizBanks().then(b => { setBanks(b); setLoading(false); });
  }, []);

  useEffect(() => {
    if (user) {
      getUserAccuracy(user.uid).then(a => {
        if (a.totalQuestions > 0) {
          setAccuracy(Math.min(100, Math.round((a.totalCorrect / a.totalQuestions) * 100)));
        }
      });
      getUserLongestStreak(user.uid).then(s => setLongestStreak(s ?? 0)).catch(() => setLongestStreak(0));
      getUserResults(user.uid).then(r => setRecapResults(r)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    window.addEventListener('focus', refreshCompleted);
    return () => window.removeEventListener('focus', refreshCompleted);
  }, [refreshCompleted]);

  const rapidSets = useMemo(() => {
    if (banks.length === 0) return [];
    const pool = allQuestions(banks);
    if (pool.length < 20) return [];
    return Array.from({ length: RAPID_SET_COUNT }, (_, i) => ({
      id: `rapid-${generation}-${i}`,
      label: `Set ${String(i + 1).padStart(2, '0')}`,
      questions: shuffle(pool).slice(0, 20),
    }));
  }, [banks, generation]);

  const visibleSets = rapidSets.filter(set => !completedSetIds.has(set.id));

  function handleGenerate() {
    saveCompleted([]);
    setCompletedSetIds(new Set());
    setGeneration(g => g + 1);
  }

  const reviewCards = [];
  const seen = new Set();
  for (const r of recapResults) {
    const ans = r.answers || [];
    for (const a of ans) {
      if (!a.isCorrect && !seen.has(a.question)) {
        seen.add(a.question);
        reviewCards.push(a);
      }
    }
  }

  const activeCards = reviewCards.filter((_, i) => !dismissed.has(i));

  function handleDismiss(idx) {
    setDismissed(prev => new Set([...prev, idx]));
  }

  function handleLogoutClick() { setShowLogoutModal(true); }

  async function confirmLogout() {
    setShowLogoutModal(false);
    await logoutUser();
    navigate('/auth');
  }

  return (
    <div className="home-page">
      <div className="home-bg" />
      <div className="home-noise" />

      <header className="home-header">
        <div className="header-brand">
          <span className="header-logo">Quizora</span>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={() => navigate('/profile')}>
            <User size={16} />
            <span>Profile</span>
          </button>
          <button className="header-btn" onClick={handleLogoutClick} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-section" style={{ animationDelay: '0ms' }}>
          <h1 className="welcome-title">
            Welcome back, <span className="welcome-name">{user?.displayName?.split(' ')[0] || 'Learner'}</span>
          </h1>
        </div>

        {profile && (
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon-wrap"><Zap size={20} /></div>
              <AnimatedStat value={profile.totalQuizzes} />
              <div className="stat-label">Quizzes Taken</div>
            </div>
            <div className="stat-card stat-hero">
              <div className="stat-hero-glow" />
              <div className="stat-icon-wrap"><Target size={20} /></div>
              <AnimatedStat value={accuracy} suffix="%" />
              <div className="stat-label">Accuracy</div>
              <div className="stat-progress">
                <div className="stat-progress-fill" style={{ width: `${accuracy || 0}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap"><Flame size={20} /></div>
              <AnimatedStat value={profile?.longestStreak ?? longestStreak} />
              <div className="stat-label">Best Streak</div>
            </div>
          </div>
        )}

        {!loading && banks.length > 0 && allQuestions(banks).length >= FULL_QUIZ_SIZE && (
          <div className="section-block fullquiz-section" style={{ animationDelay: '240ms' }}>
            <div className="section-block-header">
              <div>
                <h2 className="section-block-title">Full Quiz</h2>
                <p className="section-block-sub">{FULL_QUIZ_SIZE} random questions from all topics · ~{Math.floor(FULL_QUIZ_SIZE * 67 / 60)} min</p>
              </div>
              <button className="shuffle-btn" onClick={() => {
                promptQuiz('/quiz/rapid', { rapidQuestions: shuffle(allQuestions(banks)).slice(0, FULL_QUIZ_SIZE) });
              }}>
                <RefreshCw size={14} />
                Generate
              </button>
            </div>
            <div className="fullquiz-card" onClick={() => {
              promptQuiz('/quiz/rapid', { rapidQuestions: shuffle(allQuestions(banks)).slice(0, FULL_QUIZ_SIZE) });
            }}>
              <div className="fullquiz-icon"><Layers size={24}/></div>
              <div className="fullquiz-body">
                <div className="fullquiz-title">Start Full Quiz</div>
                <div className="fullquiz-meta">{FULL_QUIZ_SIZE} questions across all topics</div>
              </div>
              <button className="fullquiz-start" onClick={e => { e.stopPropagation(); promptQuiz('/quiz/rapid', { rapidQuestions: shuffle(allQuestions(banks)).slice(0, FULL_QUIZ_SIZE) }); }}>
                Start <ArrowRight size={12} className="btn-arrow" />
              </button>
            </div>
          </div>
        )}

        {!loading && rapidSets.length > 0 && (
          <div className="section-block quickplay-section" style={{ animationDelay: '360ms' }}>
            <div className="section-block-header">
              <div>
                <h2 className="section-block-title">Quick Play</h2>
                <p className="section-block-sub">20 random questions from all topics · ~{Math.floor(20 * 22 / 60)} min</p>
              </div>
              <button className="shuffle-btn" onClick={handleGenerate}>
                <RefreshCw size={14} />
                Generate
              </button>
            </div>
            <div className="rapid-grid">
              {visibleSets.map(set => (
                <div key={set.id} className="rapid-card" onClick={() => promptQuiz('/quiz/rapid', { rapidQuestions: set.questions, setId: set.id })}>
                  <span className="rapid-card-icon"><Zap size={16} /></span>
                  <div className="rapid-card-body">
                    <div className="rapid-num">{set.label}</div>
                    <div className="rapid-meta">{set.questions.length} questions</div>
                  </div>
                  <button className="rapid-play" onClick={e => { e.stopPropagation(); promptQuiz('/quiz/rapid', { rapidQuestions: set.questions, setId: set.id }); }}>
                    Play <ArrowRight size={12} className="btn-arrow" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="section-block" style={{ animationDelay: '480ms' }}>
          <div className="section-block-header">
            <div>
              <h2 className="section-block-title">Available Quizzes</h2>
              <p className="section-block-sub">{banks.length} quiz bank{banks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {loading ? (
            <div className="banks-grid">
              {[1, 2, 3].map(i => <div key={i} className="bank-card-skeleton" />)}
            </div>
          ) : banks.length === 0 ? (
            <div className="empty-state">
              <p>No quizzes available yet.</p>
            </div>
          ) : (
            (() => {
              const grouped = { easy: [], medium: [], hard: [] };
              banks.forEach(b => {
                const d = (b.difficulty || 'medium').toLowerCase();
                if (grouped[d]) grouped[d].push(b);
              });
              Object.values(grouped).forEach(arr => arr.sort((a, b) => a.questionCount - b.questionCount));
              const sorted = Object.entries(grouped).filter(([, arr]) => arr.length);
              return sorted.map(([diff, arr]) => (
                <div key={diff}>
                  <div className="diff-group-header">
                    <span className={`diff-label diff-${diff}`}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</span>
                    <span className="diff-count">{arr.length} bank{arr.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="banks-grid">
                    {arr.map(bank => (
                      <div key={bank.id} className={`bank-card bank-${diff}`} onClick={() => promptQuiz(`/quiz/${bank.id}`)}>
                        <div className="bank-qs-col">
                          <span className="bank-qs-num">{bank.questionCount}</span>
                          <span className="bank-qs-lbl">questions</span>
                        </div>
                        <div className="bank-body">
                          <h3 className="bank-card-title">{bank.title}</h3>
                          <div className="bank-meta">
                            <span>~{Math.floor(bank.questionCount * 67 / 60)} min</span>
                          </div>
                          <button className="bank-start" onClick={e => { e.stopPropagation(); promptQuiz(`/quiz/${bank.id}`); }}>
                            Start <ArrowRight size={12} className="btn-arrow" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>

        {activeCards.length > 0 && (
          <div className="section-block recap-section" style={{ animationDelay: '600ms' }}>
            <div className="section-block-header">
              <div>
                <h2 className="section-block-title">Review Mistakes</h2>
                <p className="section-block-sub">{activeCards.length} question{activeCards.length !== 1 ? 's' : ''} to practice</p>
              </div>
              <button className="hints-toggle" onClick={() => setHintsOn(h => !h)} title={hintsOn ? 'Hide hints' : 'Show hints'}>
                {hintsOn ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            <RecapCard
              key={activeCards[0].question}
              answer={activeCards[0]}
              hintsOn={hintsOn}
              onDismiss={() => handleDismiss(reviewCards.indexOf(activeCards[0]))}
            />
          </div>
        )}
      </main>

      {showQuizModal && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-accent" />
            <div className="modal-body">
              <div className="modal-icon modal-icon--brand"><Play size={22} /></div>
              <h3 className="modal-title">Start Quiz</h3>
              <p className="modal-desc">You're about to begin. The timer will start once you enter.</p>
              <div className="modal-actions">
                <button className="btn-nav" onClick={() => setShowQuizModal(false)}>Cancel</button>
                <button className="btn-submit" onClick={confirmQuiz}>Begin</button>
              </div>
            </div>
          </div>
        </div>
      )}

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