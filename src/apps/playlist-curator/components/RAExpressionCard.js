import React from 'react';
import './PlaylistCuratorApp.css';

export const RAExpressionCard = ({ parse }) => (
  <div className="pc-card">
    <h3 style={{ margin: 0 }}>Relational Algebra Plan</h3>
    {parse.status === 'ok' && parse.expression ? (
      <pre className="pc-expression">{parse.expression}</pre>
    ) : (
      <p className="pc-hint">Waiting for a parsable query…</p>
    )}
  </div>
);
