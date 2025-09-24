import { placeholderWords } from '../data/placeholderWords';
import { useSelection } from '../context/SelectionContext';

export function TreePlaceholder() {
  const { selectedWordId } = useSelection();
  const selectedWord = placeholderWords.find((entry) => entry.id === selectedWordId);

  return (
    <section className="panel" aria-labelledby="tree-heading" role="region">
      <div className="panel-header">
        <h2 id="tree-heading">Tree view</h2>
        <p>D3.js will render an interactive collapsible tree that follows each word&rsquo;s lineage.</p>
      </div>
      <div className="panel-body">
        {selectedWord ? (
          <div className="tree-placeholder" role="status">
            <p>
              <strong>{selectedWord.word}</strong> &middot; {selectedWord.language} ({selectedWord.family})
            </p>
            <p>{selectedWord.summary}</p>
            <ul>
              {selectedWord.keyMoments.map((moment) => (
                <li key={moment.id}>
                  <strong>{moment.label}</strong> — {moment.detail}
                  <div className="timeline-period">{moment.period}</div>
                </li>
              ))}
            </ul>
            <p className="panel-note">Interactive zoom, pan, and focus affordances land in S4.</p>
          </div>
        ) : (
          <p role="status">Select a word to preview its etymological structure.</p>
        )}
      </div>
    </section>
  );
}
