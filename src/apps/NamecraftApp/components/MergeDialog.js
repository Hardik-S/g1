import React, { useState } from 'react';
import '../NamecraftApp.css';
import { nowIso } from '../utils/dates.js';

const dedupeByLabel = (items) => {
  const map = new Map();
  items.forEach((item) => {
    const key = item.label || item.title;
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
};

const MergeDialog = ({ existing, incoming, onResolve, onCancel }) => {
  const [structureChoice, setStructureChoice] = useState('merge');
  const [scenarioChoice, setScenarioChoice] = useState('merge');

  const resolve = () => {
    let nextRoom = { ...existing };
    if (structureChoice === 'incoming') {
      nextRoom = { ...incoming };
    } else if (structureChoice === 'merge') {
      nextRoom = {
        ...existing,
        title: incoming.title || existing.title,
        notes: incoming.notes || existing.notes,
        names: dedupeByLabel([...(existing.names || []), ...(incoming.names || [])]),
      };
    }

    if (scenarioChoice === 'incoming') {
      nextRoom = { ...nextRoom, scenarios: incoming.scenarios || [] };
    } else if (scenarioChoice === 'merge') {
      const combined = dedupeByLabel([...(existing.scenarios || []), ...(incoming.scenarios || [])]);
      nextRoom = { ...nextRoom, scenarios: combined };
    }

    nextRoom = { ...nextRoom, updatedAt: nowIso() };
    onResolve(nextRoom);
  };

  return (
    <div className="namecraft-merge-overlay" role="dialog" aria-modal="true">
      <div className="namecraft-merge-dialog">
        <header>
          <h2 style={{ margin: 0 }}>Resolve shared room</h2>
          <p className="namecraft-inline-hint">
            A room with id <code>{existing.id}</code> exists. Decide how to merge the shared data.
          </p>
        </header>
        <div className="namecraft-merge-options">
          <div className="namecraft-merge-row">
            <strong>Structure</strong>
            <label className="namecraft-merge-choice">
              <input
                type="radio"
                name="namecraft-structure"
                value="existing"
                checked={structureChoice === 'existing'}
                onChange={() => setStructureChoice('existing')}
              />
              Keep existing room title, notes, and candidates
            </label>
            <label className="namecraft-merge-choice">
              <input
                type="radio"
                name="namecraft-structure"
                value="incoming"
                checked={structureChoice === 'incoming'}
                onChange={() => setStructureChoice('incoming')}
              />
              Replace with shared room
            </label>
            <label className="namecraft-merge-choice">
              <input
                type="radio"
                name="namecraft-structure"
                value="merge"
                checked={structureChoice === 'merge'}
                onChange={() => setStructureChoice('merge')}
              />
              Merge and deduplicate candidate labels
            </label>
          </div>
          <div className="namecraft-merge-row">
            <strong>Scenarios</strong>
            <label className="namecraft-merge-choice">
              <input
                type="radio"
                name="namecraft-scenarios"
                value="existing"
                checked={scenarioChoice === 'existing'}
                onChange={() => setScenarioChoice('existing')}
              />
              Keep local scenarios
            </label>
            <label className="namecraft-merge-choice">
              <input
                type="radio"
                name="namecraft-scenarios"
                value="incoming"
                checked={scenarioChoice === 'incoming'}
                onChange={() => setScenarioChoice('incoming')}
              />
              Replace with shared scenarios
            </label>
            <label className="namecraft-merge-choice">
              <input
                type="radio"
                name="namecraft-scenarios"
                value="merge"
                checked={scenarioChoice === 'merge'}
                onChange={() => setScenarioChoice('merge')}
              />
              Merge by scenario title
            </label>
          </div>
        </div>
        <footer style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="namecraft-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="namecraft-button is-primary" onClick={resolve}>
            Apply merge
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MergeDialog;
