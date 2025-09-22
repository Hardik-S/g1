import { useEffect, useMemo, useState } from 'react';
import styles from './AssessPanel.module.css';
import { useCacheLabStore } from '../state/useCacheLabStore';
import { generateAssessment, Question } from '../lib/assessments';

const AssessPanel: React.FC = () => {
  const { config, trace, assessment, recordAssessment, resetAssessment } = useCacheLabStore((state) => ({
    config: state.config,
    trace: state.trace,
    assessment: state.assessment,
    recordAssessment: state.recordAssessment,
    resetAssessment: state.resetAssessment,
  }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const questions = useMemo(() => generateAssessment(config, trace, 5), [config, trace]);

  useEffect(() => {
    setCurrentIndex(0);
    setSelected(null);
    setFeedback(null);
  }, [questions]);

  const currentQuestion: Question | undefined = questions[currentIndex];

  const handleSubmit = () => {
    if (selected === null || !currentQuestion) return;
    const correct = selected === currentQuestion.answerIndex;
    setFeedback(correct ? 'Correct! Well reasoned.' : `Not quite. ${currentQuestion.explanation}`);
    recordAssessment(correct);
  };

  const handleNext = () => {
    setSelected(null);
    setFeedback(null);
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className={styles.panel} aria-live="polite">
      <header>
        <h3 className={styles.question}>{currentQuestion.prompt}</h3>
        <p>
          Score: {assessment.correct}/{assessment.total} ·
          <button type="button" onClick={resetAssessment} style={{ marginLeft: '0.5rem', background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>
            Reset
          </button>
        </p>
      </header>
      <div className={styles.choices} role="radiogroup" aria-label="Assessment choices">
        {currentQuestion.choices.map((choice, index) => (
          <label key={choice} className={styles.choice}>
            <input
              type="radio"
              name="assessment-choice"
              checked={selected === index}
              onChange={() => setSelected(index)}
            />
            {choice}
          </label>
        ))}
      </div>
      {feedback && <div className={styles.feedback}>{feedback}</div>}
      <div className={styles.actions}>
        <button type="button" onClick={handleSubmit}>
          Check Answer
        </button>
        <button type="button" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AssessPanel;
