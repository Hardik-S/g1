import React from 'react';
import '../NamecraftApp.css';

const scoreClass = (value) => {
  if (value >= 85) return 'namecraft-score-strong';
  if (value >= 60) return 'namecraft-score-medium';
  return 'namecraft-score-weak';
};

const ResultsPanel = ({
  room,
  evaluations,
  platoMarkdown,
  onCopyPlato,
  onExportJson,
  onExportPdf,
  onGenerateShare,
  shareLink,
  shareError,
  shareLimit,
}) => {
  return (
    <section className="namecraft-panel" aria-labelledby="namecraft-results-heading">
      <div className="namecraft-results-header">
        <h2 id="namecraft-results-heading">Results</h2>
        <div className="namecraft-keyboard-hint">
          <span>T</span>
          <span>E</span>
        </div>
      </div>

      {evaluations.length ? (
        evaluations.map((evaluation) => (
          <article key={evaluation.nameId} className="namecraft-result-card">
            <header>
              <h3 style={{ margin: 0 }}>
                {evaluation.label}{' '}
                <span className={scoreClass(evaluation.total)}>
                  {evaluation.total.toFixed(1)} / 100
                </span>
              </h3>
              <p className="namecraft-inline-hint">{evaluation.rubric.summary}</p>
            </header>
            <table className="namecraft-table">
              <thead>
                <tr>
                  <th>Heuristic</th>
                  <th>Weight</th>
                  <th>Score</th>
                  <th>Weighted</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.breakdown.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.label}</td>
                    <td>{entry.weight}%</td>
                    <td className={scoreClass(entry.score)}>{entry.score.toFixed(1)}</td>
                    <td>{entry.weightedScore.toFixed(1)}</td>
                    <td>{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <section className="namecraft-rubric">
              <strong>Refinements</strong>
              {evaluation.rubric.refinements.length ? (
                evaluation.rubric.refinements.map((refinement, index) => (
                  <span key={index} className="namecraft-inline-hint">
                    • {refinement}
                  </span>
                ))
              ) : (
                <span className="namecraft-inline-hint">All heuristics cleared thresholds.</span>
              )}
            </section>
            <section className="namecraft-diagnostics">
              <strong>Diagnostics</strong>
              {evaluation.diagnostics.length ? (
                evaluation.diagnostics.map((line, index) => (
                  <div key={index} className="namecraft-diagnostic-line">
                    <span>⚠️</span>
                    <span>{line}</span>
                  </div>
                ))
              ) : (
                <div className="namecraft-diagnostic-line">
                  <span>✅</span>
                  <span>Ready for peer validation.</span>
                </div>
              )}
            </section>
          </article>
        ))
      ) : (
        <div className="namecraft-empty-state">Run the deterministic test to view weighted heuristics.</div>
      )}

      <section className="namecraft-panel" style={{ gap: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Exports</h3>
        <div className="namecraft-export-grid">
          <button type="button" className="namecraft-button" onClick={onExportJson}>
            💾 JSON export
          </button>
          <button type="button" className="namecraft-button" onClick={onExportPdf}>
            📄 PDF export
          </button>
          <button type="button" className="namecraft-button" onClick={() => onCopyPlato(platoMarkdown)}>
            📋 Copy PLATO.md
          </button>
          <button type="button" className="namecraft-button" onClick={onGenerateShare}>
            🔗 Generate share URL
          </button>
          {shareLink && (
            <p className="namecraft-inline-hint" style={{ wordBreak: 'break-all' }}>
              Share ({shareLink.length} chars ≤ {shareLimit}): {shareLink}
            </p>
          )}
          {shareError && <p className="namecraft-inline-hint">{shareError}</p>}
        </div>
        <details>
          <summary>PLATO preview</summary>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', lineHeight: 1.6 }}>{platoMarkdown}</pre>
        </details>
      </section>
    </section>
  );
};

export default ResultsPanel;
