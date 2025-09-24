import React from 'react';
import './PlaylistCuratorApp.css';
import { EXAMPLE_QUERIES } from '../nlp/lexicon';

export const ExamplesTray = ({ onSelect }) => (
  <div className="pc-card">
    <h3 style={{ margin: 0 }}>Example Queries</h3>
    <p className="pc-hint">Click any query to load it instantly and inspect the resulting RA plan.</p>
    <div className="pc-examples">
      {EXAMPLE_QUERIES.map((example) => (
        <button key={example} type="button" className="pc-example-button" onClick={() => onSelect(example)}>
          {example}
        </button>
      ))}
    </div>
  </div>
);
