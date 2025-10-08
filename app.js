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

const { useState, useEffect, useRef } = React;

function Crown(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 11 4-7 5 5 5-5 4 7" />
      <path d="M5 19h14" />
      <path d="M5 15h14" />
    </svg>
  );
}

function parseFENString(fen) {
  const rows = fen.split(' ')[0].split('/');
  return rows.map((row) => {
    const squares = [];
    for (const char of row) {
      if (Number.isInteger(Number(char))) {
        squares.push(...Array.from({ length: Number(char) }, () => null));
      } else {
        squares.push(char);
      }
    }
    return squares;
  });
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function getPieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'w' : 'b';
}

function getPseudoMoves(board, row, col, color, forAttack = false) {
  const piece = board[row][col];
  if (!piece) return [];
  const type = piece.toLowerCase();
  const moves = [];

  const addMove = (r, c) => {
    if (!inBounds(r, c)) return false;
    const target = board[r][c];
    if (!target) {
      moves.push([r, c]);
      return true;
    }
    if (getPieceColor(target) !== color) {
      moves.push([r, c]);
    }
    return false;
  };

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const forwardOne = row + dir;
    if (!forAttack && inBounds(forwardOne, col) && !board[forwardOne][col]) {
      moves.push([forwardOne, col]);
      const forwardTwo = row + dir * 2;
      if (row === startRow && !board[forwardTwo][col]) {
        moves.push([forwardTwo, col]);
      }
    }

    [-1, 1].forEach((dc) => {
      const targetRow = row + dir;
      const targetCol = col + dc;
      if (!inBounds(targetRow, targetCol)) return;
      if (forAttack) {
        moves.push([targetRow, targetCol]);
      } else {
        const targetPiece = board[targetRow][targetCol];
        if (targetPiece && getPieceColor(targetPiece) !== color) {
          moves.push([targetRow, targetCol]);
        }
      }
    });

    return moves;
  }

  if (type === 'n') {
    const jumps = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    jumps.forEach(([dr, dc]) => {
      if (!inBounds(row + dr, col + dc)) return;
      const target = board[row + dr][col + dc];
      if (!target || getPieceColor(target) !== color) {
        moves.push([row + dr, col + dc]);
      }
    });
    return moves;
  }

  const directions = [];
  if (type === 'b' || type === 'q') {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  }
  if (type === 'r' || type === 'q') {
    directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
  }
  if (type === 'k') {
    const kingMoves = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
    kingMoves.forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) return;
      const target = board[r][c];
      if (!target || getPieceColor(target) !== color) {
        moves.push([r, c]);
      }
    });
    return moves;
  }

  directions.forEach(([dr, dc]) => {
    for (let step = 1; step < 8; step += 1) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (!inBounds(r, c)) break;
      const target = board[r][c];
      if (!target) {
        moves.push([r, c]);
        continue;
      }
      if (getPieceColor(target) !== color) {
        moves.push([r, c]);
      }
      break;
    }
  });

  return moves;
}

function isSquareAttacked(board, row, col, attackerColor) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece) continue;
      if (getPieceColor(piece) !== attackerColor) continue;
      const pseudoMoves = getPseudoMoves(board, r, c, attackerColor, piece.toLowerCase() === 'p');
      if (pseudoMoves.some(([mr, mc]) => mr === row && mc === col)) {
        return true;
      }
    }
  }
  return false;
}

function isInCheck(board, color) {
  let kingRow = -1;
  let kingCol = -1;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if ((color === 'w' && piece === 'K') || (color === 'b' && piece === 'k')) {
        kingRow = r;
        kingCol = c;
        break;
      }
    }
    if (kingRow !== -1) break;
  }

  if (kingRow === -1) return false;
  const attacker = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingRow, kingCol, attacker);
}

function getLegalMoves(board, row, col, color) {
  const pseudoMoves = getPseudoMoves(board, row, col, color, false);
  const legal = [];
  pseudoMoves.forEach(([targetRow, targetCol]) => {
    const snapshot = cloneBoard(board);
    const piece = snapshot[row][col];
    snapshot[row][col] = null;
    snapshot[targetRow][targetCol] = piece;

    if (piece && piece.toLowerCase() === 'p' && (targetRow === 0 || targetRow === 7)) {
      snapshot[targetRow][targetCol] = color === 'w' ? 'Q' : 'q';
    }

    if (!isInCheck(snapshot, color)) {
      legal.push([targetRow, targetCol]);
    }
  });
  return legal;
}

function hasAnyLegalMoves(board, color) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece) continue;
      if (getPieceColor(piece) !== color) continue;
      if (getLegalMoves(board, r, c, color).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function ClaudeChess() {
  const [board, setBoard] = useState(() => parseFENString(INITIAL_FEN));
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [turn, setTurn] = useState('w');
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [engineStatus, setEngineStatus] = useState('loading');

  const workerRef = useRef(null);
  const cdnIndexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    initStockfish();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initStockfish() {
    cdnIndexRef.current = 0;
    setEngineStatus('loading');

    const tryNextCDN = () => {
      if (cdnIndexRef.current >= STOCKFISH_CDNS.length) {
        setEngineStatus('failed');
        return;
      }

      const cdn = STOCKFISH_CDNS[cdnIndexRef.current];
      try {
        const worker = new Worker(cdn);
        workerRef.current = worker;

        timeoutRef.current = setTimeout(() => {
          worker.terminate();
          cdnIndexRef.current += 1;
          tryNextCDN();
        }, 7000);

        worker.onmessage = (event) => {
          const data = typeof event.data === 'string' ? event.data : event.data?.data;
          if (!data) return;

          if (data === 'uciok') {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setEngineStatus('ready');
            worker.postMessage('isready');
          } else if (data === 'readyok') {
            setEngineStatus('ready');
          } else if (typeof data === 'string' && data.startsWith('bestmove')) {
            const move = data.split(' ')[1];
            if (move && move !== '(none)') {
              makeStockfishMove(move);
            }
          }
        };

        worker.onerror = () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          worker.terminate();
          cdnIndexRef.current += 1;
          tryNextCDN();
        };

        worker.postMessage('uci');
      } catch (error) {
        cdnIndexRef.current += 1;
        tryNextCDN();
      }
    };

    tryNextCDN();
  }

  function makeMove(fromRow, fromCol, toRow, toCol) {
    if (gameOver) return;
    const piece = board[fromRow][fromCol];
    if (!piece) return;

    const updatedBoard = cloneBoard(board);
    updatedBoard[toRow][toCol] = piece;
    updatedBoard[fromRow][fromCol] = null;

    if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
      updatedBoard[toRow][toCol] = turn === 'w' ? 'Q' : 'q';
    }

    const moveNotation = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const nextTurn = turn === 'w' ? 'b' : 'w';

    const opponentInCheck = isInCheck(updatedBoard, nextTurn);
    const opponentHasMoves = hasAnyLegalMoves(updatedBoard, nextTurn);

    setBoard(updatedBoard);
    setMoveHistory((prev) => [...prev, moveNotation]);
    setTurn(nextTurn);
    setSelected(null);
    setValidMoves([]);

    if (!opponentHasMoves) {
      setGameOver(opponentInCheck ? `${turn === 'w' ? 'White' : 'Black'} wins!` : 'Stalemate!');
    } else {
      setGameOver(null);
    }
  }

  function makeStockfishMove(move) {
    if (!move || move.length < 4) return;
    const fromCol = move.charCodeAt(0) - 97;
    const fromRow = 8 - Number(move[1]);
    const toCol = move.charCodeAt(2) - 97;
    const toRow = 8 - Number(move[3]);

    if ([fromRow, fromCol, toRow, toCol].some((value) => Number.isNaN(value))) {
      return;
    }

    setTimeout(() => {
      makeMove(fromRow, fromCol, toRow, toCol);
    }, 300);
  }

  useEffect(() => {
    if (turn === 'b' && !gameOver && workerRef.current && engineStatus === 'ready') {
      const moves = moveHistory.join(' ');
      workerRef.current.postMessage(`position startpos${moves ? ` moves ${moves}` : ''}`);
      workerRef.current.postMessage('go depth 10');
    }
  }, [turn, gameOver, engineStatus, moveHistory]);

  function handleSquareClick(row, col) {
    if (gameOver || turn === 'b') return;

    if (selected) {
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        makeMove(selected[0], selected[1], row, col);
      }
      setSelected(null);
      setValidMoves([]);
      return;
    }

    const piece = board[row][col];
    if (!piece) return;
    const color = getPieceColor(piece);
    if (color !== turn) return;

    const legalMoves = getLegalMoves(board, row, col, color);
    if (legalMoves.length === 0) return;

    setSelected([row, col]);
    setValidMoves(legalMoves);
  }

  function resetGame() {
    setBoard(parseFENString(INITIAL_FEN));
    setTurn('w');
    setSelected(null);
    setValidMoves([]);
    setMoveHistory([]);
    setGameOver(null);
    if (workerRef.current) {
      workerRef.current.postMessage('ucinewgame');
      workerRef.current.postMessage('position startpos');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
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

          <div className="flex justify-between items-center mb-4 text-white">
            <div className="text-lg">
              Turn: <span className="font-bold">{turn === 'w' ? 'White (You)' : 'Black (AI)'}</span>
            </div>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
            >
              New Game
            </button>
          </div>

          <div className="aspect-square bg-slate-800 rounded-lg p-2 shadow-2xl">
            <div className="grid grid-cols-8 gap-0 h-full">
              {board.map((rowArr, rowIndex) =>
                rowArr.map((piece, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selected?.[0] === rowIndex && selected?.[1] === colIndex;
                  const isValidMove = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={`flex items-center justify-center cursor-pointer text-4xl transition ${
                        isLight ? 'bg-amber-100' : 'bg-amber-700'
                      } ${isSelected ? 'ring-4 ring-blue-500' : ''} ${
                        isValidMove ? 'ring-4 ring-green-400' : ''
                      } hover:opacity-80`}
                    >
                      {piece && PIECES[piece]}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<ClaudeChess />);
}
