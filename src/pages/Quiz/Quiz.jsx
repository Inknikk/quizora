import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getQuizBank, saveResult, saveBlunders } from '../../firebase/firestore';
import { updateUserStats } from '../../firebase/auth';
import { ChevronLeft, ChevronRight, Flag, Clock, CheckCircle, ZapOff, Flame, LogOut, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import './Quiz.css';

const NONE_OPTION = 'None of the above';
const RAPID_COUNT = 20;
const SECONDS_PER_QUESTION = 60;
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
  const [submitting, setSubmitting] = useState(false);
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
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [focusedOption, setFocusedOption] = useState(0);
  const optionsRef = useRef(null);

  const isRapid = searchParams.get('rapid') === '1';

  useEffect(() => {
    const blunderQs = location.state?.blunderQuestions;
    if (blunderQs && blunderQs.length > 0) {
      try {
        const q = blunderQs.map(q => ({
          ...q,
          options: shuffle(q.options),
        }));
        setQuestions(q);
        setTimeLeft(q.length * SECONDS_PER_QUESTION);
      } catch { /* silent */ }
      setLoading(false);
      return;
    }
    const rapidQs = location.state?.rapidQuestions;
    if (rapidQs) {
      try {
        const q = rapidQs.map(q => {
          const opts = shuffle(q.options);
          if (q.correctAnswers.length > 1 && opts.length === 4 && !opts.includes(NONE_OPTION)) {
            opts.push(NONE_OPTION);
          }
          return { ...q, options: opts };
        });
        setQuestions(q);
        setTimeLeft(q.length * RAPID_SECONDS_PER_QUESTION);
      } catch { /* silent */ }
      setLoading(false);
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
  }, [id, isRapid, location.state, navigate]);

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

  const handleSubmitRef = useRef(null);
  useEffect(() => { handleSubmitRef.current = doSubmit; });
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmitRef.current?.(); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  const q = questions[current];
  const isAnswered = questionStatus[current]?.answered;
  const isMulti = q?.correctAnswers.length > 1;
  const qLen = q?.question.length + (q?.options.reduce((s, o) => s + o.length, 0) || 0);
  const isCompact = qLen > 450;
  const fontScale = Math.min(1.15, Math.max(0.85, 1.0 - (qLen - 250) * 0.0006));

  useEffect(() => {
    setFocusedOption(0);
    optionsRef.current?.children[0]?.focus();
  }, [current]);

  useEffect(() => {
    if (!q || isAnswered) return;
    optionsRef.current?.children[focusedOption]?.focus();
  }, [focusedOption, q, isAnswered]);

  useEffect(() => {
    if (submitted || loading) return;
    function onKeyDown(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const max = (q?.options.length || 1) - 1;
        setFocusedOption(prev => e.key === 'ArrowDown' ? Math.min(prev + 1, max) : Math.max(prev - 1, 0));
        return;
      }
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) && e.key !== 'Backspace') return;
      if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && current > 0) {
        e.preventDefault();
        setCurrent(c => c - 1);
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        if (isMulti && !isAnswered) {
          toggleMultiOption(q.options[focusedOption]);
        } else if (!isMulti && !isAnswered) {
          handleSingleSelect(q.options[focusedOption]);
        }
        return;
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (isMulti && !isAnswered) checkMultiSelect();
        else if (!isMulti && !isAnswered) handleSingleSelect(q.options[focusedOption]);
        return;
      }
      if (e.key === 'ArrowRight' && current < questions.length - 1) {
        e.preventDefault();
        setCurrent(c => c + 1);
        return;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, submitted, loading, focusedOption, q, isMulti, isAnswered, questions.length]);

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

  function handleSubmitClick() {
    if (submittingRef.current || submitted) return;
    const unanswered = questions.filter((_, i) => !questionStatus[i]?.answered).length;
    if (unanswered > 0) {
      setShowUnansweredModal(true);
      return;
    }
    doSubmit();
  }

  async function doSubmit() {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    setSubmitting(true);
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
      options: q.options,
      selected: selected[i] || [],
      correct: q.correctAnswers,
      isCorrect: q.correctAnswers.length === (selected[i]||[]).length &&
        q.correctAnswers.every(a => (selected[i]||[]).includes(a))
    }));
    if (user) {
      const bs = bestStreakRef.current;
      try {
        await saveResult(user.uid, id, correct, questions.length, answers, bs);
        const wrongAnswers = answers.filter(a => !a.isCorrect).map(a => ({
          question: a.question,
          options: a.options,
          correct: a.correct,
        }));
        if (wrongAnswers.length > 0) saveBlunders(user.uid, wrongAnswers);
        const newStreak = await updateUserStats(user.uid, correct, questions.length, bs);
        if (newStreak > 0) setProfile(prev => ({ ...prev, longestStreak: newStreak }));
      } catch { /* silent */ }
    }
    const setId = location.state?.setId;
    if (setId) {
      try {
        const stored = JSON.parse(localStorage.getItem('quizora_completed_rapid') || '[]');
        stored.push(setId);
        localStorage.setItem('quizora_completed_rapid', JSON.stringify(stored));
      } catch { /* silent */ }
    }
    navigate('/results', { state: { correct, total: questions.length, answers, bankTitle: bank?.title || (id === 'blunder' ? 'Blunder Quiz' : 'Rapid Quiz') } });
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
      <div className="quiz-topbar glass">
        <button className="icon-btn" onClick={() => { if (submitted) navigate('/'); else setShowExitModal(true); }}><ChevronLeft size={20}/></button>
        <div className="quiz-info">
          <span className="quiz-title-sm">
            {location.state?.quizTitle || (bank ? bank.title + (isRapid ? ' · Rapid' : '') : id === 'blunder' ? 'Blunder Quiz' : 'Rapid Quiz')}
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

      <div className="quiz-main">
        <div className="quiz-container">
          <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}/>
        </div>

        <div className={`quiz-card glass${isCompact ? ' q-compact' : ''}`} style={{ '--q-scale': fontScale }}>
          <div className="q-number">Question {current + 1}</div>
          {isMulti && !isAnswered && <div className="multi-hint">Select {q.correctAnswers.length} answers</div>}
          <p className="q-text">{q.question}</p>

          <div className="options-list" ref={optionsRef}>
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
                  tabIndex={i === focusedOption ? 0 : -1}
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

          {isMulti && !isAnswered && hasSelection && (
            <button className="btn-check" onClick={checkMultiSelect} title="Ctrl + Enter">
              <CheckCircle size={16}/> Check Answers
            </button>
          )}
        </div>

        <div className="quiz-nav">
          <button className="btn-nav" onClick={() => setCurrent(c => c - 1)} disabled={current === 0} title="Backspace / ←">
            <ChevronLeft size={18}/> Prev
          </button>
          <div className="dot-nav">
            {questions.map((_, i) => (
              <button key={i} className={`dot ${i === current ? 'active' : ''} ${questionStatus[i]?.answered && questionStatus[i]?.correct ? 'dot-done' : ''} ${questionStatus[i]?.answered && !questionStatus[i]?.correct ? 'dot-incorrect' : ''} ${selected[i] && !questionStatus[i]?.answered ? 'answered' : ''} ${flagged.has(i) ? 'dot-flagged' : ''}`}
                onClick={() => setCurrent(i)}/>
            ))}
          </div>
          {current < questions.length - 1 ? (
            <button className="btn-nav" onClick={() => setCurrent(c => c + 1)} title="→">
              Next <ChevronRight size={18}/>
            </button>
          ) : (
            <button className="btn-submit" onClick={handleSubmitClick} disabled={submitted || submitting}>
              {submitting ? <><Loader size={16} className="submit-spinner"/> Submitting…</> : 'Submit Quiz'}
            </button>
          )}
        </div>

        {showUnansweredModal && (
          <div className="modal-overlay" onClick={() => setShowUnansweredModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-accent" />
              <div className="modal-body">
                <div className="modal-icon modal-icon--brand"><LogOut size={22} /></div>
                <h3 className="modal-title">Unanswered questions</h3>
                <p className="modal-desc">{questions.filter((_, i) => !questionStatus[i]?.answered).length} question{questions.filter((_, i) => !questionStatus[i]?.answered).length !== 1 ? 's' : ''} haven't been answered. Submit anyway?</p>
                <div className="modal-actions">
                  <button className="btn-nav" onClick={() => setShowUnansweredModal(false)}>Review</button>
                  <button className="btn-submit" onClick={() => { setShowUnansweredModal(false); doSubmit(); }}>Submit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showExitModal && (
          <div className="modal-overlay" onClick={() => { setShowExitModal(false); window.history.pushState(null, ''); }}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-accent modal-accent--danger" />
              <div className="modal-body">
                <div className="modal-icon modal-icon--danger"><LogOut size={22} /></div>
                <h3 className="modal-title">Leave quiz?</h3>
                <p className="modal-desc">Your progress will be lost if you leave before submitting.</p>
                <div className="modal-actions">
                  <button className="btn-nav" onClick={() => { setShowExitModal(false); window.history.pushState(null, ''); }}>Stay</button>
                  <button className="btn-submit" onClick={() => { setShowExitModal(false); navigate('/'); }}>Leave</button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      </div>
  );
}
