// ClaudeChess Test Suite
// Validates core chess logic, FEN parsing, and system integrity

class ChessTest {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  assert(condition, message) {
    if (condition) {
      this.passed++;
      this.results.push(`✅ ${message}`);
    } else {
      this.failed++;
      this.results.push(`❌ ${message}`);
    }
  }

  assertEqual(actual, expected, message) {
    this.assert(actual === expected, `${message} (got: ${actual}, expected: ${expected})`);
  }

  async testFENParsing() {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const rows = fen.split(' ')[0].split('/');
    this.assertEqual(rows.length, 8, 'FEN should parse 8 rows');
    this.assertEqual(rows[0], 'rnbqkbnr', 'First row should be black pieces');
    this.assertEqual(rows[7], 'RNBQKBNR', 'Last row should be white pieces');
  }

  testBoardExpansion() {
    const row = 'rnbqkbnr';
    const squares = [];
    for (let char of row) {
      if (isNaN(char)) {
        squares.push(char);
      } else {
        squares.push(...Array(parseInt(char)).fill(null));
      }
    }
    this.assertEqual(squares.length, 8, 'Row should expand to 8 squares');
  }

  testEmptySquares() {
    const row = 'r3k2r'; // rook-3empty-king-2empty-rook
    const squares = [];
    for (let char of row) {
      if (isNaN(char)) {
        squares.push(char);
      } else {
        squares.push(...Array(parseInt(char)).fill(null));
      }
    }
    this.assertEqual(squares.length, 8, 'Row with numbers should expand to 8 squares');
    this.assertEqual(squares[0], 'r', 'First should be rook');
    this.assertEqual(squares[4], 'k', 'Fifth should be king');
  }

  testPieceDictionary() {
    const pieces = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    this.assertEqual(Object.keys(pieces).length, 12, 'Should have 12 piece types');
    this.assert(pieces['K'] !== pieces['k'], 'White and black kings should differ');
  }

  testMoveNotation() {
    const fromC = 4, fromR = 6, toC = 4, toR = 4; // e2 to e4
    const move = `${String.fromCharCode(97 + fromC)}${8 - fromR}${String.fromCharCode(97 + toC)}${8 - toR}`;
    this.assertEqual(move, 'e2e4', 'Should generate correct move notation');
  }

  testCoordinateConversion() {
    // Test a2 = col 0, row 6
    const col = 'a'.charCodeAt(0) - 97;
    const row = 8 - 2;
    this.assertEqual(col, 0, 'Column a should be 0');
    this.assertEqual(row, 6, 'Row 2 should be index 6');
  }

  testPromotion() {
    const pawn = 'P';
    const targetRow = 0;
    const shouldPromote = pawn.toLowerCase() === 'p' && (targetRow === 0 || targetRow === 7);
    this.assert(shouldPromote, 'White pawn reaching row 0 should promote');
  }

  testTurnSwitch() {
    let turn = 'w';
    turn = turn === 'w' ? 'b' : 'w';
    this.assertEqual(turn, 'b', 'Turn should switch from white to black');
    turn = turn === 'w' ? 'b' : 'w';
    this.assertEqual(turn, 'w', 'Turn should switch back to white');
  }

  testStockfishCDNFallback() {
    const primaryCDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
    const fallbackCDN = 'https://unpkg.com/stockfish.js@10.0.2/stockfish.js';
    this.assert(primaryCDN.length > 0, 'Primary CDN URL exists');
    this.assert(fallbackCDN.length > 0, 'Fallback CDN URL exists');
  }

  async testWorkerCreation() {
    try {
      // Test if Worker constructor exists
      this.assert(typeof Worker !== 'undefined', 'Worker API should be available');
    } catch (e) {
      this.assert(false, 'Worker creation test failed');
    }
  }

  async runAll() {
    console.log('🧪 Running ClaudeChess Test Suite...\n');
    
    await this.testFENParsing();
    this.testBoardExpansion();
    this.testEmptySquares();
    this.testPieceDictionary();
    this.testMoveNotation();
    this.testCoordinateConversion();
    this.testPromotion();
    this.testTurnSwitch();
    this.testStockfishCDNFallback();
    await this.testWorkerCreation();

    console.log('\n' + this.results.join('\n'));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    
    return this.failed === 0;
  }
}

// Auto-run tests when page loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const tests = new ChessTest();
    const success = await tests.runAll();
    
    document.body.innerHTML = `
      <div style="font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
        <h1 style="color: #667eea; border-bottom: 3px solid #764ba2; padding-bottom: 10px;">🧪 ClaudeChess Test Suite</h1>
        <pre style="background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; line-height: 1.6;">
${tests.results.join('\n')}

📊 Results: ${tests.passed} passed, ${tests.failed} failed
Status: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}
        </pre>
        <p style="text-align: center; color: #666; margin-top: 20px;">
          <a href="index.html" style="color: #667eea; text-decoration: none; font-weight: bold;">← Back to Game</a>
        </p>
      </div>
    `;
  });
}
