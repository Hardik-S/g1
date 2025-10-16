import React, { useState, useEffect, useRef, useCallback } from 'react';

const PIECES = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const STOCKFISH_CDNS = [
  'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
  'https://unpkg.com/stockfish.js@10.0.2/stockfish.js',
];

const Crown = ({ className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2 18h20" />
    <path d="M5 18l1-11 5 5 5-5 1 11" />
    <path d="M5 18h14" />
  </svg>
);

function isWhitePiece(piece) {
  return piece === piece.toUpperCase();
}

function parseFENToBoard(fen) {
  const rows = fen.split(' ')[0].split('/');
  return rows.map((row) => {
    const squares = [];
    for (const char of row) {
      if (isNaN(char)) {
        squares.push(char);
      } else {
        const count = parseInt(char, 10);
        for (let i = 0; i < count; i++) {
          squares.push(null);
        }
      }
    }
    return squares;
  });
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function applyMove(board, fromR, fromC, toR, toC, promotionChar = null) {
  if (!board[fromR] || board[fromR][fromC] == null) {
    return board;
  }
  const newBoard = cloneBoard(board);
  const piece = newBoard[fromR][fromC];
  newBoard[fromR][fromC] = null;
  let movingPiece = piece;
  if (piece.toLowerCase() === 'p' && (toR === 0 || toR === 7)) {
    const promote = (promotionChar || 'q').toLowerCase();
    movingPiece = isWhitePiece(piece) ? promote.toUpperCase() : promote;
  }
  newBoard[toR][toC] = movingPiece;
  return newBoard;
}

function boardToFEN(board, turn) {
  const rows = board.map((row) => {
    let fenRow = '';
    let empty = 0;
    row.forEach((square) => {
      if (square) {
        if (empty > 0) {
          fenRow += empty;
          empty = 0;
        }
        fenRow += square;
      } else {
        empty += 1;
      }
    });
    if (empty > 0) {
      fenRow += empty;
    }
    return fenRow;
  });
  return `${rows.join('/')}` + ` ${turn} KQkq - 0 1`;
}

function findKing(board, color) {
  const king = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function isSquareAttacked(board, row, col, attackerColor) {
  const pawnDirection = attackerColor === 'w' ? -1 : 1;
  const pawnRow = row + pawnDirection;
  const pawnPieces = attackerColor === 'w' ? 'P' : 'p';
  if (board[pawnRow]?.[col - 1] === pawnPieces || board[pawnRow]?.[col + 1] === pawnPieces) {
    return true;
  }

  const knightOffsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  const knightPiece = attackerColor === 'w' ? 'N' : 'n';
  for (const [dr, dc] of knightOffsets) {
    const piece = board[row + dr]?.[col + dc];
    if (piece === knightPiece) {
      return true;
    }
  }

  const directions = {
    bishop: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
    rook: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
  };

  const bishopPieces = attackerColor === 'w' ? ['B', 'Q'] : ['b', 'q'];
  for (const [dr, dc] of directions.bishop) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r][c];
      if (piece) {
        if (bishopPieces.includes(piece)) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const rookPieces = attackerColor === 'w' ? ['R', 'Q'] : ['r', 'q'];
  for (const [dr, dc] of directions.rook) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r][c];
      if (piece) {
        if (rookPieces.includes(piece)) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const kingPiece = attackerColor === 'w' ? 'K' : 'k';
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (board[row + dr]?.[col + dc] === kingPiece) {
        return true;
      }
    }
  }

  return false;
}

function checkForCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) {
    return false;
  }
  const opponent = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingPos.row, kingPos.col, opponent);
}

function getPseudoMoves(board, row, col) {
  const piece = board[row]?.[col];
  if (!piece) {
    return [];
  }
  const isWhite = isWhitePiece(piece);
  const color = isWhite ? 'w' : 'b';
  const moves = [];
  const type = piece.toLowerCase();

  const addMove = (r, c, options = {}) => {
    if (r < 0 || r >= 8 || c < 0 || c >= 8) {
      return false;
    }
    const target = board[r][c];
    if (!target) {
      moves.push({ row: r, col: c, ...options });
      return true;
    }
    if ((color === 'w' && !isWhitePiece(target)) || (color === 'b' && isWhitePiece(target))) {
      moves.push({ row: r, col: c, ...options });
    }
    return false;
  };

  if (type === 'p') {
    const dir = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;
    const oneStep = row + dir;
    if (board[oneStep]?.[col] == null) {
      const promotion = oneStep === 0 || oneStep === 7 ? { promotion: 'q' } : {};
      moves.push({ row: oneStep, col, ...promotion });
      if (row === startRow) {
        const twoStep = row + dir * 2;
        if (board[twoStep]?.[col] == null) {
          moves.push({ row: twoStep, col });
        }
      }
    }
    const captureOffsets = [-1, 1];
    captureOffsets.forEach((offset) => {
      const targetRow = row + dir;
      const targetCol = col + offset;
      const target = board[targetRow]?.[targetCol];
      if (!target) {
        return;
      }
      if ((isWhite && !isWhitePiece(target)) || (!isWhite && isWhitePiece(target))) {
        const promotion = targetRow === 0 || targetRow === 7 ? { promotion: 'q' } : {};
        moves.push({ row: targetRow, col: targetCol, ...promotion });
      }
    });
  } else if (type === 'n') {
    const offsets = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    offsets.forEach(([dr, dc]) => addMove(row + dr, col + dc));
  } else if (type === 'b' || type === 'q') {
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    directions.forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        if (!addMove(row + dr * i, col + dc * i)) {
          break;
        }
      }
    });
  }
  if (type === 'r' || type === 'q') {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    directions.forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        if (!addMove(row + dr * i, col + dc * i)) {
          break;
        }
      }
    });
  } else if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addMove(row + dr, col + dc);
      }
    }
  }

  return moves;
}

function getLegalMovesForPiece(board, row, col) {
  const piece = board[row]?.[col];
  if (!piece) {
    return [];
  }
  const color = isWhitePiece(piece) ? 'w' : 'b';
  const pseudoMoves = getPseudoMoves(board, row, col);
  return pseudoMoves.filter((move) => {
    const simulated = applyMove(board, row, col, move.row, move.col, move.promotion || null);
    if (simulated === board) {
      return false;
    }
    return !checkForCheck(simulated, color);
  });
}

function hasAnyLegalMove(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if ((color === 'w' && isWhitePiece(piece)) || (color === 'b' && !isWhitePiece(piece))) {
        if (getLegalMovesForPiece(board, r, c).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function toUCIMove(fromR, fromC, toR, toC, promotion, piece) {
  const base = `${String.fromCharCode(97 + fromC)}${8 - fromR}${String.fromCharCode(97 + toC)}${8 - toR}`;
  const needsPromotion = promotion || (piece.toLowerCase() === 'p' && (toR === 0 || toR === 7));
  return needsPromotion ? `${base}${(promotion || 'q').toLowerCase()}` : base;
}

const ClaudeChessApp = ({ onBack }) => {
  const [board, setBoard] = useState(() => parseFENToBoard(INITIAL_FEN));
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [turn, setTurn] = useState('w');
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [engineStatus, setEngineStatus] = useState('loading');
  const workerRef = useRef(null);
  const workerURLRef = useRef(null);
  const cdnIndexRef = useRef(0);
  const makeStockfishMoveRef = useRef(() => {});

  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (workerURLRef.current) {
      URL.revokeObjectURL(workerURLRef.current);
      workerURLRef.current = null;
    }
  }, []);

  const makeMove = useCallback(
    (fromR, fromC, toR, toC, promotion = null) => {
      const piece = board[fromR]?.[fromC];
      if (!piece || gameOver) {
        return;
      }
      const promotionChar = promotion || (piece.toLowerCase() === 'p' && (toR === 0 || toR === 7) ? 'q' : null);
      const updatedBoard = applyMove(board, fromR, fromC, toR, toC, promotionChar);
      if (updatedBoard === board) {
        return;
      }
      const movingColor = isWhitePiece(piece) ? 'w' : 'b';
      const opponent = movingColor === 'w' ? 'b' : 'w';
      setBoard(updatedBoard);
      setSelected(null);
      setValidMoves([]);
      setTurn(opponent);
      setMoveHistory((prev) => [...prev, toUCIMove(fromR, fromC, toR, toC, promotionChar, piece)]);
      const opponentInCheck = checkForCheck(updatedBoard, opponent);
      const opponentHasMoves = hasAnyLegalMove(updatedBoard, opponent);
      if (opponentInCheck && !opponentHasMoves) {
        setGameOver(`${movingColor === 'w' ? 'White' : 'Black'} wins by checkmate!`);
      } else if (!opponentHasMoves) {
        setGameOver('Stalemate!');
      } else {
        setGameOver(null);
      }
    },
    [board, gameOver],
  );

  const makeStockfishMove = useCallback(
    (move) => {
      if (!move || move === '(none)' || turn !== 'b' || gameOver) {
        return;
      }
      const fromC = move.charCodeAt(0) - 97;
      const fromR = 8 - parseInt(move[1], 10);
      const toC = move.charCodeAt(2) - 97;
      const toR = 8 - parseInt(move[3], 10);
      const promotion = move.length > 4 ? move[4] : null;
      if ([fromR, fromC, toR, toC].some((value) => Number.isNaN(value))) {
        return;
      }
      setTimeout(() => makeMove(fromR, fromC, toR, toC, promotion), 300);
    },
    [makeMove, turn, gameOver],
  );

  makeStockfishMoveRef.current = makeStockfishMove;

  useEffect(() => {
    let cancelled = false;

    const createWorkerFromCDN = async (cdn) => {
      const response = await fetch(cdn, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load Stockfish from ${cdn}`);
      }
      const script = await response.text();
      const blob = new Blob([script], { type: 'application/javascript' });
      if (workerURLRef.current) {
        URL.revokeObjectURL(workerURLRef.current);
      }
      const workerURL = URL.createObjectURL(blob);
      workerURLRef.current = workerURL;
      return new Worker(workerURL);
    };

    const initStockfish = async () => {
      setEngineStatus('loading');
      while (!cancelled && cdnIndexRef.current < STOCKFISH_CDNS.length) {
        const cdn = STOCKFISH_CDNS[cdnIndexRef.current];
        try {
          const worker = await createWorkerFromCDN(cdn);
          if (cancelled) {
            worker.terminate();
            return;
          }
          workerRef.current = worker;

          let ready = false;
          const timeoutId = setTimeout(() => {
            if (!ready) {
              worker.onerror?.(new Event('error'));
            }
          }, 8000);

          worker.onmessage = (event) => {
            const data = event.data;
            if (typeof data === 'string') {
              if (data === 'uciok') {
                ready = true;
                clearTimeout(timeoutId);
                setEngineStatus('ready');
                worker.postMessage('isready');
              } else if (data === 'readyok') {
                worker.postMessage('ucinewgame');
              } else if (data.startsWith('bestmove')) {
                const move = data.split(' ')[1];
                makeStockfishMoveRef.current(move);
              }
            } else if (data?.bestmove) {
              makeStockfishMoveRef.current(data.bestmove);
            }
          };

          worker.onerror = () => {
            clearTimeout(timeoutId);
            cleanupWorker();
            cdnIndexRef.current += 1;
            initStockfish();
          };

          worker.postMessage('uci');
          return;
        } catch (error) {
          cdnIndexRef.current += 1;
        }
      }
      if (!cancelled) {
        setEngineStatus('failed');
      }
    };

    initStockfish();

    return () => {
      cancelled = true;
      cleanupWorker();
    };
  }, [cleanupWorker]);

  useEffect(() => {
    if (turn === 'b' && !gameOver && workerRef.current && engineStatus === 'ready') {
      const history = moveHistory.join(' ');
      workerRef.current.postMessage('stop');
      if (history.length) {
        workerRef.current.postMessage(`position startpos moves ${history}`);
      } else {
        workerRef.current.postMessage('position startpos');
      }
      workerRef.current.postMessage('go depth 10');
    }
  }, [turn, moveHistory, gameOver, engineStatus]);

  const handleSquareClick = (row, col) => {
    if (gameOver || turn === 'b') {
      return;
    }

    if (selected) {
      if (selected[0] === row && selected[1] === col) {
        setSelected(null);
        setValidMoves([]);
        return;
      }
      const move = validMoves.find((candidate) => candidate.row === row && candidate.col === col);
      if (move) {
        makeMove(selected[0], selected[1], row, col, move.promotion || null);
      } else {
        setSelected(null);
        setValidMoves([]);
      }
      return;
    }

    const piece = board[row]?.[col];
    if (!piece || piece !== piece.toUpperCase()) {
      return;
    }
    const moves = getLegalMovesForPiece(board, row, col);
    setSelected([row, col]);
    setValidMoves(moves);
  };

  const resetGame = () => {
    setBoard(parseFENToBoard(INITIAL_FEN));
    setTurn('w');
    setSelected(null);
    setValidMoves([]);
    setMoveHistory([]);
    setGameOver(null);
    workerRef.current?.postMessage('stop');
    workerRef.current?.postMessage('ucinewgame');
  };

  const currentFEN = boardToFEN(board, turn);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {onBack && (
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white/90 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              ← Back to Apps
            </button>
          </div>
        )}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Crown className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-bold text-white">ClaudeChess</h1>
          </div>
          <p className="text-purple-300">Play against Stockfish</p>
          {engineStatus === 'loading' && (
            <p className="text-yellow-300 text-sm mt-2">⏳ Loading chess engine...</p>
          )}
          {engineStatus === 'failed' && (
            <p className="text-red-300 text-sm mt-2">⚠️ Engine failed to load. Play vs yourself.</p>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
          {gameOver && (
            <div className="mb-4 p-4 bg-yellow-400 text-slate-900 rounded-lg text-center font-bold text-xl">
              {gameOver}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-between items-center mb-4 text-white">
            <div className="text-lg">
              Turn: <span className="font-bold">{turn === 'w' ? 'White (You)' : 'Black (AI)'}</span>
            </div>
            <div className="text-sm text-purple-200 truncate">
              FEN: <span className="font-mono">{currentFEN}</span>
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
            >
              New Game
            </button>
          </div>

          <div className="aspect-square bg-slate-800 rounded-lg p-2 shadow-2xl">
            <div className="grid grid-cols-8 gap-0 h-full">
              {board.map((row, r) =>
                row.map((piece, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selected?.[0] === r && selected?.[1] === c;
                  const isValidMove = validMoves.some((candidate) => candidate.row === r && candidate.col === c);

                  return (
                    <button
                      type="button"
                      key={`${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`flex items-center justify-center text-4xl transition ${
                        isLight ? 'bg-amber-100' : 'bg-amber-700'
                      } ${isSelected ? 'ring-4 ring-blue-500' : ''} ${
                        isValidMove ? 'ring-4 ring-green-400' : ''
                      } hover:opacity-80`}
                    >
                      {piece && PIECES[piece]}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeChessApp;
