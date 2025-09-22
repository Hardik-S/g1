import styles from './ExplanationCard.module.css';

interface ExplanationCardProps {
  title: string;
  points: string[];
  formulae?: string[];
  children?: React.ReactNode;
}

const ExplanationCard: React.FC<ExplanationCardProps> = ({ title, points, formulae, children }) => {
  return (
    <aside className={styles.card} aria-live="polite">
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {formulae?.map((formula) => (
        <code key={formula} className={styles.formula} aria-label="formula">
          {formula}
        </code>
      ))}
      {children}
    </aside>
  );
};

export default ExplanationCard;
