import React from 'react';

const GardenColumn = ({ title, entries }) => (
  <section className="zen-garden-column">
    <h2>{title}</h2>
    {entries.length === 0 ? (
      <p className="zen-empty-hint">Nothing planted yet.</p>
    ) : (
      <ul className="zen-garden-list">
        {entries.map((entry) => (
          <li key={entry.id} className={`zen-garden-item${entry.isSnapshot ? ' is-snapshot' : ''}`}>
            <div className="zen-garden-card">
              <div className="zen-garden-card-header">
                <span className="zen-garden-card-title">{entry.title}</span>
                {entry.isSnapshot && <span className="zen-garden-card-tag">Persisted</span>}
              </div>
              <div className="zen-garden-card-progress">
                Stage {entry.stage.completedStages} / {entry.stage.totalStages}
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const GardenView = ({ priority, bonus }) => (
  <div className="zen-garden-view">
    <GardenColumn title="Priority Trees" entries={priority} />
    <GardenColumn title="Bonus Bushes" entries={bonus} />
  </div>
);

export default GardenView;
