import React, { useEffect, useRef, useState } from 'react';
import './ChessApp.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_NAMES = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const PIECE_SPRITES = {
  w: {
    k: 'assets/chess/wK.svg',
    q: 'assets/chess/wQ.svg',
    r: 'assets/chess/wR.svg',
    b: 'assets/chess/wB.svg',
    n: 'assets/chess/wN.svg',
    p: 'assets/chess/wP.svg',
  },
  b: {
    k: 'assets/chess/bK.svg',
    q: 'assets/chess/bQ.svg',
    r: 'assets/chess/bR.svg',
    b: 'assets/chess/bB.svg',
    n: 'assets/chess/bN.svg',
    p: 'assets/chess/bP.svg',
  },
};

const resolveAssetPath = (relativePath) => {
  if (!relativePath) return null;
  if (typeof window === 'undefined') {
    return relativePath;
  }

  try {
    const url = new URL(relativePath, window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch (error) {
    return relativePath;
  }
};

const getPieceSprite = (piece) => {
  if (!piece) return null;
  const sprite = PIECE_SPRITES[piece.color]?.[piece.type];
  if (!sprite) return null;
  return resolveAssetPath(sprite);
};

const pieceClass = (piece) => {
  if (!piece) return '';
  const color = piece.color === 'w' ? 'white' : 'black';
  return `piece ${color} ${piece.type}`;
};

const ChessBoard = ({
  board,
  lastMove,
  onMoveAttempt,
  selectedSquare,
  legalMoves,
  onSquareSelect,
  interactionDisabled,
  isDraggable,
}) => {
  const boardRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event) => {
      const state = dragStateRef.current;
      if (!state) return;
      setDragState((prev) => (prev ? {
        ...prev,
        currentX: event.clientX,
        currentY: event.clientY,
      } : prev));
    };

    const handlePointerUp = (event) => {
      finalizeMove(event);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState]);

  const finalizeMove = (event) => {
    const state = dragStateRef.current;
    if (!state) return;
    const { boardRect, squareSize: size, from } = state;
    const x = event.clientX - boardRect.left;
    const y = event.clientY - boardRect.top;

    let moved = false;
    if (x >= 0 && y >= 0 && x < boardRect.width && y < boardRect.height) {
      const fileIndex = Math.floor(x / size);
      const rankIndex = 7 - Math.floor(y / size);
      if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
        const to = `${FILES[fileIndex]}${rankIndex + 1}`;
        moved = onMoveAttempt(from, to);
      }
    }

    if (!moved && onSquareSelect) {
      onSquareSelect(from);
    }

    setDragState(null);
  };

  const handlePointerDown = (event, square, piece) => {
    if (interactionDisabled) return;
    if (!piece) {
      if (onSquareSelect) {
        onSquareSelect(square);
      }
      return;
    }

    if (!isDraggable(square, piece)) {
      if (onSquareSelect) {
        onSquareSelect(square);
      }
      return;
    }

    event.preventDefault();
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const fileIndex = FILES.indexOf(square[0]);
    const rankIndex = parseInt(square[1], 10) - 1;
    const size = rect.width / 8;
    const originLeft = rect.left + fileIndex * size + size / 2;
    const originTop = rect.top + (7 - rankIndex) * size + size / 2;

    setDragState({
      from: square,
      piece,
      boardRect: rect,
      squareSize: size,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      offsetX: event.clientX - originLeft,
      offsetY: event.clientY - originTop,
    });

    if (onSquareSelect) {
      onSquareSelect(square);
    }
  };

  const handleSquareClick = (square) => {
    if (interactionDisabled) return;
    if (onSquareSelect) {
      onSquareSelect(square);
    }
  };

  const renderDragPiece = () => {
    if (!dragState) return null;
    const { piece, currentX, currentY, offsetX, offsetY, squareSize } = dragState;
    const left = currentX - offsetX;
    const top = currentY - offsetY;
    if (!squareSize) return null;
    const sprite = getPieceSprite(piece);
    const style = {
      width: squareSize,
      height: squareSize,
      transform: `translate(${left - squareSize / 2}px, ${top - squareSize / 2}px)`,
      backgroundImage: sprite ? `url(${sprite})` : undefined,
    };

    return (
      <div className="drag-layer">
        <div className={`drag-piece ${pieceClass(piece)}`} style={style} />
      </div>
    );
  };

  const isHighlighted = (square) => legalMoves?.includes(square);
  const isLastMoveSquare = (square) => lastMove && (lastMove.from === square || lastMove.to === square);

  const rows = [];
  for (let rank = 8; rank >= 1; rank -= 1) {
    const rowIndex = 8 - rank;
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const square = `${FILES[fileIndex]}${rank}`;
      const piece = board[rowIndex]?.[fileIndex] || null;
      const isDark = (rank + fileIndex) % 2 === 1;
      const squareClasses = [
        'square',
        isDark ? 'dark' : 'light',
      ];

      if (selectedSquare === square) squareClasses.push('selected');
      if (isHighlighted(square)) squareClasses.push('highlight');
      if (isLastMoveSquare(square)) squareClasses.push('last-move');

      const sprite = getPieceSprite(piece);
      const pieceStyle = sprite ? { backgroundImage: `url(${sprite})` } : undefined;

      rows.push(
        <div
          key={square}
          className={squareClasses.join(' ')}
          data-square={square}
          onClick={() => handleSquareClick(square)}
        >
          {piece && (!dragState || dragState.from !== square) && (
            <div
              className={pieceClass(piece)}
              onPointerDown={(event) => handlePointerDown(event, square, piece)}
              role="img"
              data-square={square}
              aria-label={`${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}`}
              style={pieceStyle}
            />
          )}
          <div className="square-label file">{FILES[fileIndex]}</div>
          <div className="square-label rank">{rank}</div>
        </div>
      );
    }
  }

  return (
    <div className="chess-board" ref={boardRef}>
      {rows}
      {renderDragPiece()}
    </div>
  );
};

export default ChessBoard;
