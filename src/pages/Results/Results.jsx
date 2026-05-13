import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Home, RotateCcw } from 'lucide-react';
import './Results.css';

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) { navigate('/'); return null; }

  const { correct, total, answers, bankTitle } = state;
  const pct = Math.round((correct / total) * 100);
  const grade = pct >= 85 ? 'Excellent!' : pct >= 70 ? 'Good Job!' : pct >= 50 ? 'Keep Practicing' : 'Keep Going!';
  const gradeColor = pct >= 85 ? 'green' : pct >= 70 ? 'blue' : pct >= 50 ? 'yellow' : 'red';

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="results-page">
      <div className="results-bg"/>
      <div className="results-container">
        <div className="results-header glass">
          <h1>Quiz Complete!</h1>
          <p className="bank-name">{bankTitle}</p>
        </div>

        <div className="score-section glass">
          <svg className="score-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" className="ring-bg"/>
            <circle cx="60" cy="60" r="54" className={`ring-fill ring-${gradeColor}`}
              strokeDasharray={circumference} strokeDashoffset={offset}/>
          </svg>
          <div className="score-text">
            <div className="score-pct">{pct}%</div>
            <div className="score-fraction">{correct}/{total}</div>
          </div>
          <div className={`grade-label grade-${gradeColor}`}>{grade}</div>
        </div>

        <div className="results-actions">
          <button className="btn-home" onClick={() => navigate('/')}><Home size={18}/> Home</button>
          <button className="btn-retry" onClick={() => navigate(`/quiz/${state.bankId || ''}`)}><RotateCcw size={18}/> Retry</button>
        </div>

        <h2 className="review-title">Answer Review</h2>
        <div className="answers-list">
          {answers.map((a, i) => (
            <div key={i} className={`answer-card glass ${a.isCorrect ? 'correct' : 'wrong'}`}>
              <div className="answer-header">
                <span className="q-num">Q{i+1}</span>
                {a.isCorrect ? <CheckCircle size={20} className="ic-correct"/> : <XCircle size={20} className="ic-wrong"/>}
              </div>
              <p className="a-question">{a.question}</p>
              {!a.isCorrect && (
                <>
                  <div className="your-ans"><span>Your answer:</span> {a.selected.join(', ') || 'Not answered'}</div>
                  <div className="correct-ans"><span>Correct:</span> {a.correct.join(', ')}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
