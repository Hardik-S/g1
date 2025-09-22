import React, { useMemo } from 'react';
import { getAvailableColumns } from './logic';

const GameBoard = ({
  board,
  onColumnSelect,
  isInteractive,
  highlightCells,
  pawStyles,
  lastMove,
  connect,
  announcement,
}) => {
  const rows = board.length;
  const columns = board[0].length;
  const available = useMemo(() => new Set(getAvailableColumns(board)), [board]);
  const highlightSet = useMemo(() => {
    if (!highlightCells) {
      return new Set();
    }
    return new Set(highlightCells.map(([r, c]) => `${r}-${c}`));
  }, [highlightCells]);

  const renderCell = (rowIndex, columnIndex) => {
    const occupant = board[rowIndex][columnIndex];
    if (!occupant) {
      return null;
    }
    const isNew = lastMove && lastMove.row === rowIndex && lastMove.column === columnIndex;
    const isWinning = highlightSet.has(`${rowIndex}-${columnIndex}`);
    const pawClass = pawStyles[occupant] || 'paw-default';

    return (
      <div
        key={`token-${rowIndex}-${columnIndex}`}
        className={`paw-token ${pawClass}${isWinning ? ' is-winning' : ''}${isNew ? ' is-new' : ''}`}
        style={{ '--drop-distance': rowIndex + 1 }}
      />
    );
  };

  return (
    <div
      className="cat-connect-four-board"
      role="grid"
      aria-live="polite"
      aria-label="Cat Connect Four board"
      style={{ '--column-count': columns, '--row-count': rows }}
    >
      <div className="board-announcement" aria-hidden={!announcement}>
        {announcement}
      </div>
      <div className="board-columns" role="row">
        {Array.from({ length: columns }).map((_, columnIndex) => {
          const columnLabel = `Drop in column ${columnIndex + 1}`;
          const disabled = !isInteractive || !available.has(columnIndex);
          return (
            <button
              type="button"
              key={`column-${columnIndex}`}
              className="column-selector"
              onClick={() => onColumnSelect(columnIndex)}
              disabled={disabled}
              aria-label={columnLabel}
            >
              🐾
            </button>
          );
        })}
      </div>
      <div className="board-grid">
        {board.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} role="row" className="board-row">
            {row.map((cell, columnIndex) => (
              <div
                key={`cell-${rowIndex}-${columnIndex}`}
                className={`board-cell${highlightSet.has(`${rowIndex}-${columnIndex}`) ? ' board-cell-winning' : ''}`}
                role="gridcell"
                aria-label={cell ? `Column ${columnIndex + 1}, row ${rows - rowIndex}` : 'Empty slot'}
              >
                {renderCell(rowIndex, columnIndex)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="connect-target">Connect {connect} to win!</div>
    </div>
  );
};

export default GameBoard;
