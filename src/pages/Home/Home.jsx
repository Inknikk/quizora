import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getQuizBanks, getUserAccuracy } from '../../firebase/firestore';
import { logoutUser } from '../../firebase/auth';
import { BookOpen, LogOut, User, Zap, Trophy, Target, ZapOff, Clock } from 'lucide-react';
import './Home.css';

const RAPID_SET_COUNT = 10;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Home() {
  const { user, profile } = useAuth();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    getQuizBanks().then(b => { setBanks(b); setLoading(false); });
  }, []);

  useEffect(() => {
    if (user) {
      getUserAccuracy(user.uid).then(a => {
        if (a.totalQuestions > 0) {
          setAccuracy(Math.min(100, Math.round((a.totalCorrect / a.totalQuestions) * 100)));
          setTotalCorrect(a.totalCorrect);
        }
      });
    }
  }, [user]);

  const rapidSets = useMemo(() => {
    if (banks.length === 0) return [];
    const allQuestions = banks.flatMap(b => b.questions);
    if (allQuestions.length < 20) return [];
    return Array.from({ length: RAPID_SET_COUNT }, (_, i) => ({
      id: `rapid-${i}`,
      label: `Quick Play #${i + 1}`,
      questions: shuffle(allQuestions).slice(0, 20),
    }));
  }, [banks]);

  async function handleLogout() {
    await logoutUser();
    navigate('/auth');
  }

  const displayAccuracy = accuracy !== null ? `${accuracy}%` : '—';

  return (
    <div className="home-page">
      <div className="home-bg" />

      <header className="home-header glass">
        <div className="header-logo"><span className="logo-q">Q</span>uizora</div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => navigate('/profile')}><User size={20}/></button>
          <button className="icon-btn" onClick={handleLogout}><LogOut size={20}/></button>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-section">
          <h1>Welcome back, <span className="accent">{user?.displayName?.split(' ')[0] || 'Learner'}</span> 👋</h1>
          <p className="subtitle">Ready to sharpen your knowledge?</p>
        </div>

        {profile && (
          <div className="stats-row">
            <div className="stat-card glass">
              <Zap size={22} className="stat-icon purple"/>
              <div className="stat-value">{profile.totalQuizzes}</div>
              <div className="stat-label">Quizzes Taken</div>
            </div>
            <div className="stat-card glass">
              <Target size={22} className="stat-icon blue"/>
              <div className="stat-value">{displayAccuracy}</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-card glass">
              <Trophy size={22} className="stat-icon gold"/>
              <div className="stat-value">{totalCorrect}</div>
              <div className="stat-label">Correct Answers</div>
            </div>
          </div>
        )}

        {!loading && rapidSets.length > 0 && (
          <div className="rapid-section-wrap">
            <div className="rapid-section-header">
              <ZapOff size={22} className="rapid-section-icon"/>
              <div>
                <div className="rapid-section-title">Quick Play</div>
                <div className="rapid-section-sub">20 random questions from all topics · {Math.ceil(20 * 25 / 60)} min · growing pool</div>
              </div>
            </div>
            <div className="rapid-sets-grid">
              {rapidSets.map(set => (
                <div key={set.id} className="rapid-card" onClick={() => navigate('/quiz/rapid', { state: { rapidQuestions: set.questions } })}>
                  <div className="rapid-card-top">
                    <ZapOff size={18} className="rapid-card-icon"/>
                    <div className="rapid-card-label">{set.label}</div>
                  </div>
                  <div className="rapid-card-meta">
                    <span>{set.questions.length} questions</span>
                    <span><Clock size={11}/> ~{Math.ceil(set.questions.length * 25 / 60)} min</span>
                  </div>
                  <button className="btn-start" onClick={e => { e.stopPropagation(); navigate('/quiz/rapid', { state: { rapidQuestions: set.questions } }); }}>Play →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="section-title">Available Quizzes</h2>

        {loading ? (
          <div className="loading-grid">
            {[1,2,3].map(i => <div key={i} className="bank-card skeleton"/>)}
          </div>
        ) : banks.length === 0 ? (
          <div className="empty-state glass">
            <BookOpen size={48} />
            <p>No quizzes available yet. Ask your admin to upload some!</p>
          </div>
        ) : (
          <div className="banks-grid">
            {banks.map(bank => (
              <div key={bank.id} className="bank-card glass" onClick={() => navigate(`/quiz/${bank.id}`)}>
                <div className="bank-badge">{bank.category || 'General'}</div>
                <h3 className="bank-title">{bank.title}</h3>
                <p className="bank-desc">{bank.description || `${bank.questionCount} questions`}</p>
                <div className="bank-meta">
                  <span>{bank.questionCount} Qs</span>
                  <span className={`diff diff-${(bank.difficulty||'medium').toLowerCase()}`}>
                    {bank.difficulty || 'Medium'}
                  </span>
                </div>
                <button className="btn-start" onClick={e => { e.stopPropagation(); navigate(`/quiz/${bank.id}`); }}>Start Quiz →</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
