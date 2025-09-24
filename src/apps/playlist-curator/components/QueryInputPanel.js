import React from 'react';
import './PlaylistCuratorApp.css';

const EntityChips = ({ entities }) => {
  const chips = [];
  if (entities.genre) chips.push({ label: 'Genre', value: entities.genre });
  if (entities.mood) chips.push({ label: 'Mood', value: entities.mood });
  if (entities.activity) chips.push({ label: 'Activity', value: entities.activity });
  if (entities.yearRange) chips.push({ label: 'Years', value: `${entities.yearRange.start}–${entities.yearRange.end - 1}` });
  if (entities.bpm) chips.push({ label: 'BPM', value: `${entities.bpm.operator} ${entities.bpm.value}` });
  if (entities.users?.length) chips.push({ label: 'Users', value: entities.users.join(', ') });
  if (entities.country) chips.push({ label: 'Country', value: entities.country });

  if (chips.length === 0) {
    return <p className="pc-hint">No entities detected yet. Start typing to see live parsing.</p>;
  }

  return (
    <div className="pc-entity-chips">
      {chips.map((chip) => (
        <span key={`${chip.label}-${chip.value}`} className="pc-chip">
          {chip.label}: {chip.value}
        </span>
      ))}
    </div>
  );
};

export const QueryInputPanel = ({ query, parse, onChange, onClear, onRandom }) => (
  <div className="pc-card">
    <div>
      <label htmlFor="pc-query" className="pc-status-ok">
        Natural language request
      </label>
      <textarea
        id="pc-query"
        className="pc-query-input"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Find upbeat rock songs from the 2000s for working out"
      />
    </div>
    <div className="pc-entity-chip-wrapper">
      <EntityChips entities={parse.entities ?? {}} />
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button type="button" className="pc-example-button" onClick={onRandom}>
        Surprise me
      </button>
      <button type="button" className="pc-example-button" onClick={onClear}>
        Clear
      </button>
    </div>
  </div>
);
