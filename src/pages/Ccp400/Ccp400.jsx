import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuizBank } from '../../firebase/firestore';
import { ChevronLeft, Zap, Layers, ArrowRight, Loader } from 'lucide-react';
import './Ccp400.css';

const SET_COUNT = 8;
const QUESTIONS_PER_SET = 50;
const TIME_PER_SET = 50;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Ccp400() {
  const navigate = useNavigate();
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizBank('CCP_400').then(b => {
      setBank(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allQuestions = bank?.questions || [];
  const totalQuestions = allQuestions.length;

  const sets = Array.from({ length: SET_COUNT }, (_, i) => {
    const start = i * QUESTIONS_PER_SET;
    const questions = shuffle(allQuestions).slice(start, start + QUESTIONS_PER_SET);
    return {
      id: `ccp-set-${i + 1}`,
      label: `Set ${String(i + 1).padStart(2, '0')}`,
      questions,
    };
  });

  function startSet(set) {
    navigate('/quiz/rapid', {
      state: {
        rapidQuestions: set.questions,
        quizTitle: `CCP 400 — ${set.label}`,
      },
    });
  }

  if (loading) {
    return (
      <div className="ccp-loading">
        <Loader size={24} className="ccp-spinner"/> Loading questions…
      </div>
    );
  }

  return (
    <div className="ccp-page">
      <div className="ccp-bg"/>
      <div className="ccp-container">
        <div className="ccp-topbar glass">
          <button className="icon-btn" onClick={() => navigate('/')}><ChevronLeft size={20}/></button>
          <h2>CCP 400</h2>
          <div className="icon-btn-placeholder"/>
        </div>

        <div className="ccp-hero">
          <div className="ccp-hero-icon"><Layers size={32}/></div>
          <h1 className="ccp-hero-title">AWS CCP — 400 Questions</h1>
          <p className="ccp-hero-sub">
            {totalQuestions} total questions · 8 sets of {QUESTIONS_PER_SET} · {TIME_PER_SET} min each
          </p>
        </div>

        <div className="ccp-grid">
          {sets.map(set => (
            <div key={set.id} className="ccp-set-card" onClick={() => startSet(set)}>
              <div className="ccp-set-top">
                <Zap size={18} className="ccp-set-icon"/>
                <span className="ccp-set-label">{set.label}</span>
              </div>
              <div className="ccp-set-meta">{QUESTIONS_PER_SET} questions · {TIME_PER_SET} min</div>
              <button className="ccp-set-btn">
                Start <ArrowRight size={12} className="btn-arrow"/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}