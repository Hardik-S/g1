import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SnakeApp.css';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_DIRECTION = { x: 0, y: 0 };
const GAME_SPEED = 150;

const SnakeApp = ({ onBack }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(INITIAL_FOOD);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const gameLoopRef = useRef();
  const directionRef = useRef(INITIAL_DIRECTION);

  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  // Generate random food position
  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    return newFood;
  }, []);

  // Check if position is occupied by snake
  const isPositionOccupied = useCallback((pos, snakeBody) => {
    return snakeBody.some(segment => segment.x === pos.x && segment.y === pos.y);
  }, []);

  // Generate new food that's not on snake
  const generateNewFood = useCallback(() => {
    let newFood;
    do {
      newFood = generateFood();
    } while (isPositionOccupied(newFood, snake));
    return newFood;
  }, [snake, generateFood, isPositionOccupied]);

  // Move snake
  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      
      // Only move if direction is set
      if (directionRef.current.x === 0 && directionRef.current.y === 0) {
        return prevSnake;
      }
      
      head.x += directionRef.current.x;
      head.y += directionRef.current.y;

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      // Check self collision (exclude head)
      const body = newSnake.slice(1);
      if (isPositionOccupied(head, body)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => {
          const newScore = prev + 1;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('snakeHighScore', newScore.toString());
          }
          return newScore;
        });
        setFood(generateNewFood());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, highScore, generateNewFood, isPositionOccupied]);

  // Game loop
  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, GAME_SPEED);
    } else {
      clearInterval(gameLoopRef.current);
    }

    return () => clearInterval(gameLoopRef.current);
  }, [isPlaying, gameOver, moveSnake]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      const key = e.key.toLowerCase();
      const newDirection = { ...directionRef.current };

      // Start game on first key press
      if (!gameStarted && !gameOver) {
        setGameStarted(true);
        setIsPlaying(true);
      }

      // Don't process input if game is over
      if (gameOver) return;

      switch (key) {
        case 'arrowup':
        case 'w':
          if (directionRef.current.y !== 1) {
            newDirection.x = 0;
            newDirection.y = -1;
          }
          break;
        case 'arrowdown':
        case 's':
          if (directionRef.current.y !== -1) {
            newDirection.x = 0;
            newDirection.y = 1;
          }
          break;
        case 'arrowleft':
        case 'a':
          if (directionRef.current.x !== 1) {
            newDirection.x = -1;
            newDirection.y = 0;
          }
          break;
        case 'arrowright':
        case 'd':
          if (directionRef.current.x !== -1) {
            newDirection.x = 1;
            newDirection.y = 0;
          }
          break;
        default:
          return;
      }

      directionRef.current = newDirection;
      setDirection(newDirection);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(INITIAL_FOOD);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setGameOver(false);
    setScore(0);
    setIsPlaying(false);
    setGameStarted(false);
  };

  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnake = snake.some(segment => segment.x === x && segment.y === y);
        const isFood = food.x === x && food.y === y;
        const isHead = snake[0].x === x && snake[0].y === y;

        grid.push(
          <div
            key={`${x}-${y}`}
            className={`grid-cell ${isSnake ? 'snake' : ''} ${isFood ? 'food' : ''} ${isHead ? 'head' : ''}`}
            style={{
              gridColumn: x + 1,
              gridRow: y + 1
            }}
          />
        );
      }
    }
    return grid;
  };

  return (
    <div className="snake-app">
      <div className="game-background">
        <div className="grid-pattern"></div>
      </div>
      
      <div className="app-content">
        <header className="app-header">
          <button className="back-btn" onClick={onBack}>
            ← Back to Apps
          </button>
          <h1 className="app-title">Snake Game</h1>
          <div className="score-display">
            <div className="score">Score: {score}</div>
            <div className="high-score">High: {highScore}</div>
          </div>
        </header>

        <div className="game-container">
          <div className="game-board">
            <div className="grid-container">
              {renderGrid()}
            </div>
          </div>

          <div className="game-controls">
            {!gameStarted && !gameOver && (
              <div className="start-message">
                <h3>Press any arrow key or WASD to start!</h3>
              </div>
            )}
            
            {gameOver && (
              <button className="control-btn resume-btn" onClick={resetGame}>
                🔄 Play Again
              </button>
            )}
            
            <button className="control-btn reset-btn" onClick={resetGame}>
              🔄 Reset
            </button>
          </div>

          <div className="game-info">
            <div className="instructions">
              <h3>Controls</h3>
              <div className="control-grid">
                <div className="control-item">↑ W</div>
                <div className="control-item">← A</div>
                <div className="control-item">↓ S</div>
                <div className="control-item">→ D</div>
              </div>
              <p>Use WASD or Arrow Keys to control the snake</p>
            </div>

            {gameOver && (
              <div className="game-over">
                <h2>Game Over!</h2>
                <p>Final Score: {score}</p>
                {score === highScore && score > 0 && (
                  <p className="new-high-score">🎉 New High Score!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeApp;
