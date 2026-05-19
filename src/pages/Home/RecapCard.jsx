import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';

export default function RecapCard({ answer, onDismiss, hintsOn }) {
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
      setTimeout(() => setTapResult(null), 700);
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
                {tapResult === 'wrong' && opt === tapResult && <span className="opt-x">✕</span>}
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