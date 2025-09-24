import { placeholderWords } from '../data/placeholderWords';
import { useSelection } from '../context/SelectionContext';

export function TimelinePlaceholder() {
  const { selectedWordId } = useSelection();
  const selectedWord = placeholderWords.find((entry) => entry.id === selectedWordId);

  return (
    <section className="panel" aria-labelledby="timeline-heading" role="region">
      <div className="panel-header">
        <h2 id="timeline-heading">Timeline</h2>
        <p>An SVG-based horizontal timeline will synchronise with the tree selection.</p>
      </div>
      <div className="panel-body">
        {selectedWord ? (
          <ol className="timeline-list">
            {selectedWord.keyMoments.map((moment) => (
              <li className="timeline-item" key={moment.id}>
                <span className="timeline-period">{moment.period}</span>
                <strong>{moment.label}</strong>
                <p className="timeline-description">{moment.detail}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p role="status">Select a word to preview its chronological journey.</p>
        )}
      </div>
    </section>
  );
}
