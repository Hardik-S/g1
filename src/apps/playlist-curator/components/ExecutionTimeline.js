import React from 'react';
import './PlaylistCuratorApp.css';

const TablePreview = ({ relation }) => {
  if (!relation || relation.rows.length === 0) {
    return <p className="pc-hint">No rows</p>;
  }

  const head = relation.columns;
  const firstRows = relation.rows.slice(0, 6);

  return (
    <table className="pc-table">
      <thead>
        <tr>
          {head.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {firstRows.map((row, index) => (
          <tr key={index}>
            {head.map((column) => {
              const value = row.values[column];
              if (Array.isArray(value)) {
                return <td key={column}>{value.join(', ')}</td>;
              }
              return <td key={column}>{String(value)}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const ExecutionTimeline = ({ steps }) => (
  <div className="pc-card">
    <h3 style={{ margin: 0 }}>Execution Timeline</h3>
    <div className="pc-timeline">
      {steps.length === 0 ? (
        <p className="pc-hint">Parse a supported query to generate a step-by-step plan.</p>
      ) : (
        steps.map((step) => (
          <div key={step.id} className="pc-step">
            <div className="pc-step-header">
              <span>{step.label}</span>
              <span>{step.output.rows.length} rows</span>
            </div>
            <TablePreview relation={step.output} />
          </div>
        ))
      )}
    </div>
  </div>
);
