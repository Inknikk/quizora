import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getQuizBank, saveResult } from '../../firebase/firestore';
import { updateUserStats } from '../../firebase/auth';
import { ChevronLeft, ChevronRight, Flag, Clock, CheckCircle, ZapOff, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import './Quiz.css';

const NONE_OPTION = 'None of the above';
const RAPID_COUNT = 20;
const SECONDS_PER_QUESTION = Math.ceil(Math.round((80 * 60) / 65) * 0.9);
const RAPID_SECONDS_PER_QUESTION = 22;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Quiz() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, setProfile } = useAuth();
  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const [bank, setBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionStatus, setQuestionStatus] = useState({});
  const [streak, setStreak] = useState(0);
  const bestStreakRef = useRef(0);
  const [showExitModal, setShowExitModal] = useState(false);

  const isRapid = searchParams.get('rapid') === '1';

  useEffect(() => {
    const rapidQs = location.state?.rapidQuestions;
    if (rapidQs) {
      queueMicrotask(() => {
        const q = rapidQs.map(q => {
          const opts = shuffle(q.options);
          if (q.correctAnswers.length > 1 && opts.length === 4 && !opts.includes(NONE_OPTION)) {
            opts.push(NONE_OPTION);
          }
          return { ...q, options: opts };
        });
        setQuestions(q);
        setTimeLeft(q.length * RAPID_SECONDS_PER_QUESTION);
        setLoading(false);
      });
      return;
    }
    getQuizBank(id).then(b => {
      if (!b) { toast.error('Quiz not found'); navigate('/'); return; }
      setBank(b);
      let pool = shuffle(b.questions);
      if (isRapid) pool = pool.slice(0, Math.min(RAPID_COUNT, pool.length));
      const q = pool.map(q => {
        const opts = shuffle(q.options);
        if (q.correctAnswers.length > 1 && opts.length === 4 && !opts.includes(NONE_OPTION)) {
          opts.push(NONE_OPTION);
        }
        return { ...q, options: opts };
      });
      setQuestions(q);
      setTimeLeft(q.length * (isRapid ? RAPID_SECONDS_PER_QUESTION : SECONDS_PER_QUESTION));
      setLoading(false);
    });
  }, [id, isRapid, location.state]);

  useEffect(() => {
    if (submitted) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [submitted]);

  useEffect(() => {
    if (streak > bestStreakRef.current) bestStreakRef.current = streak;
  }, [streak]);

  useEffect(() => {
    if (submitted) return;
    function onPop() { setShowExitModal(true); }
    window.addEventListener('popstate', onPop);
    window.history.pushState(null, '');
    return () => window.removeEventListener('popstate', onPop);
  }, [submitted]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  const q = questions[current];
  const isAnswered = questionStatus[current]?.answered;
  const isMulti = q?.correctAnswers.length > 1;

  function getOptionState(opt) {
    if (!isAnswered) return '';
    const isCorrectAnswer = q.correctAnswers.includes(opt);
    const wasSelected = (selected[current] || []).includes(opt);
    if (isCorrectAnswer) return 'correct';
    if (wasSelected) return 'incorrect';
    return 'dimmed';
  }

  function handleSingleSelect(opt) {
    if (isAnswered || submitted) return;
    setSelected(prev => ({ ...prev, [current]: [opt] }));
    const isCorrect = q.correctAnswers[0] === opt;
    setQuestionStatus(prev => ({ ...prev, [current]: { answered: true, correct: isCorrect, checked: true } }));
    setStreak(prev => isCorrect ? prev + 1 : 0);
  }

  function toggleMultiOption(opt) {
    if (isAnswered || submitted) return;
    setSelected(prev => {
      const cur = prev[current] || [];
      if (opt === NONE_OPTION) {
        return { ...prev, [current]: cur.includes(NONE_OPTION) ? [] : [NONE_OPTION] };
      }
      if (cur.includes(NONE_OPTION)) {
        return { ...prev, [current]: [...cur.filter(x => x !== NONE_OPTION), opt] };
      }
      return { ...prev, [current]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] };
    });
  }

  function checkMultiSelect() {
    const sel = selected[current] || [];
    const isCorrect = q.correctAnswers.length === sel.length &&
      q.correctAnswers.every(a => sel.includes(a));
    setQuestionStatus(prev => ({ ...prev, [current]: { answered: true, correct: isCorrect, checked: true } }));
    setStreak(prev => isCorrect ? prev + 1 : 0);
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(current) ? next.delete(current) : next.add(current);
      return next;
    });
  }

  async function handleSubmit() {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    setSubmitted(true);
    let correct = 0;
    questions.forEach((q, i) => {
      const sel = selected[i] || [];
      const isCorrect = q.correctAnswers.length === sel.length &&
        q.correctAnswers.every(a => sel.includes(a));
      if (isCorrect) correct++;
    });
    const answers = questions.map((q, i) => ({
      question: q.question,
      selected: selected[i] || [],
      correct: q.correctAnswers,
      isCorrect: q.correctAnswers.length === (selected[i]||[]).length &&
        q.correctAnswers.every(a => (selected[i]||[]).includes(a))
    }));
    if (user) {
      const bs = bestStreakRef.current;
      try {
        await saveResult(user.uid, id, correct, questions.length, answers, bs);
        const newStreak = await updateUserStats(user.uid, correct, questions.length, bs);
        if (newStreak > 0) setProfile(prev => ({ ...prev, longestStreak: newStreak }));
      } catch { /* silent */ }
    }
    navigate('/results', { state: { correct, total: questions.length, answers, bankTitle: bank?.title || 'Rapid Quiz' } });
  }

  if (loading) return <div className="quiz-loading"><div className="spinner"/></div>;

  const progress = ((current + 1) / questions.length) * 100;
  const mins = Math.floor((timeLeft||0) / 60);
  const secs = String((timeLeft||0) % 60).padStart(2, '0');
  const selForQ = selected[current] || [];
  const hasSelection = selForQ.length > 0;

  return (
    <div className="quiz-page">
      <div className="quiz-bg"/>
      <div className="quiz-container">
        <div className="quiz-topbar glass">
          <button className="icon-btn" onClick={() => { if (submitted) navigate('/'); else setShowExitModal(true); }}><ChevronLeft size={20}/></button>
          <div className="quiz-info">
            <span className="quiz-title-sm">
              {bank ? bank.title + (isRapid ? ' · Rapid' : '') : 'Rapid Quiz'}
            </span>
            <span className="q-counter">{current + 1} / {questions.length}</span>
          </div>
          <div className="quiz-right-bar">
            {isRapid && <ZapOff size={16} className="rapid-icon" style={{color:'var(--warning)'}}/>}
            {streak >= 1 && (
              <div className="streak-badge" key={streak}>
                <Flame size={15} /> {streak}
              </div>
            )}
            {timeLeft !== null && (
              <div className={`timer ${timeLeft < 60 ? 'timer-warn' : ''}`}>
                <Clock size={14}/> {mins}:{secs}
              </div>
            )}
            <button className={`icon-btn ${flagged.has(current) ? 'flagged' : ''}`} onClick={toggleFlag}>
              <Flag size={18}/>
            </button>
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}/>
        </div>

        <div className="quiz-card glass">
          <div className="q-number">Question {current + 1}</div>
          {isMulti && !isAnswered && <div className="multi-hint">Select {q.correctAnswers.length} answers</div>}
          <p className="q-text">{q.question}</p>

          <div className="options-list">
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const optState = getOptionState(opt);
              const isSelected = selForQ.includes(opt);
              return (
                <button
                  key={i}
                  className={`option-btn ${isSelected && !isAnswered ? 'selected' : ''} ${optState}`}
                  onClick={() => isMulti ? toggleMultiOption(opt) : handleSingleSelect(opt)}
                  disabled={isAnswered && !isMulti}
                >
                  <span className="opt-letter">{letter}</span>
                  <span className="opt-text">{opt}</span>
                  {isAnswered && optState === 'correct' && <CheckCircle size={18} className="opt-ic-correct"/>}
                  {isAnswered && optState === 'incorrect' && <span className="opt-x">✕</span>}
                  {!isAnswered && isSelected && <span className="opt-check">✓</span>}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className={`feedback-banner ${questionStatus[current].correct ? 'fb-correct' : 'fb-wrong'}`}>
              {questionStatus[current].correct ? '✓ Correct!' : '✕ Not quite — the correct answer is highlighted above.'}
            </div>
          )}

          {isMulti && !isAnswered && hasSelection && (
            <button className="btn-check" onClick={checkMultiSelect}>
              <CheckCircle size={16}/> Check Answers
            </button>
          )}
        </div>

        <div className="quiz-nav">
          <button className="btn-nav" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>
            <ChevronLeft size={18}/> Prev
          </button>
          <div className="dot-nav">
            {questions.map((_, i) => (
              <button key={i} className={`dot ${i === current ? 'active' : ''} ${questionStatus[i]?.answered ? 'dot-done' : ''} ${selected[i] && !questionStatus[i]?.answered ? 'answered' : ''} ${flagged.has(i) ? 'dot-flagged' : ''}`}
                onClick={() => setCurrent(i)}/>
            ))}
          </div>
          {current < questions.length - 1 ? (
            <button className="btn-nav" onClick={() => setCurrent(c => c + 1)}>
              Next <ChevronRight size={18}/>
            </button>
          ) : (
            <button className="btn-submit" onClick={handleSubmit} disabled={submitted}>Submit Quiz</button>
          )}
        </div>

        {showExitModal && (
          <div className="modal-overlay" onClick={() => { setShowExitModal(false); window.history.pushState(null, ''); }}>
            <div className="modal-box glass" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Leave quiz?</h3>
              <p className="modal-desc">Your progress will be lost if you leave before submitting.</p>
              <div className="modal-actions">
                <button className="btn-nav" onClick={() => { setShowExitModal(false); window.history.pushState(null, ''); }}>Stay</button>
                <button className="btn-submit" onClick={() => { setShowExitModal(false); navigate('/'); }}>Leave</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
