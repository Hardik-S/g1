import React from 'react';
import './PlaylistCuratorApp.css';

const formatValue = (value) => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

export const ResultCard = ({ parse }) => {
  if (parse.status === 'error') {
    return (
      <div className="pc-card">
        <h3 style={{ margin: 0 }}>Repair Suggestions</h3>
        <p className="pc-status-error">{parse.message}</p>
        <ul>
          {parse.suggestions?.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (parse.status !== 'ok') {
    return (
      <div className="pc-card">
        <h3 style={{ margin: 0 }}>Results</h3>
        <p className="pc-hint">Enter a supported query to see relational results.</p>
      </div>
    );
  }

  const { result } = parse;
  const head = result.columns;
  const rows = result.rows;

  return (
    <div className="pc-card">
      <h3 style={{ margin: 0 }}>Results</h3>
      {rows.length === 0 ? (
        <p className="pc-hint">No rows matched the relational constraints.</p>
      ) : (
        <table className="pc-table">
          <thead>
            <tr>
              {head.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {head.map((column) => (
                  <td key={column}>{formatValue(row.values[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
