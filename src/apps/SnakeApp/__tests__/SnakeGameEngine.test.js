import { SnakeGameEngine, GAME_OVER_REASONS } from '../game/engine';
import { DIRECTIONS, GameStatus } from '../game/constants';

describe('SnakeGameEngine', () => {
  it('spawns food deterministically for the same seed', () => {
    const config = {
      gridSize: 6,
      stepMs: 100,
      initialSnake: [{ x: 0, y: 0 }],
      initialFood: { x: 1, y: 0 },
      seed: 'deterministic-seed'
    };

    const engineA = new SnakeGameEngine(config);
    const engineB = new SnakeGameEngine(config);

    engineA.setDirection(DIRECTIONS.Right);
    engineB.setDirection(DIRECTIONS.Right);

    engineA.tick(100);
    engineB.tick(100);

    expect(engineA.getState().score).toBe(1);
    expect(engineB.getState().score).toBe(1);
    expect(engineA.getState().food).toEqual(engineB.getState().food);
  });

  it('detects wall collisions and ends the game', () => {
    const engine = new SnakeGameEngine({
      gridSize: 3,
      stepMs: 100,
      initialSnake: [{ x: 2, y: 1 }],
      seed: 'wall-test'
    });

    engine.setDirection(DIRECTIONS.Right);
    engine.tick(100);
    const state = engine.getState();

    expect(state.status).toBe(GameStatus.GameOver);
    expect(state.gameOverReason).toBe(GAME_OVER_REASONS.Wall);
  });

  it('prevents reversing direction into the snake body', () => {
    const engine = new SnakeGameEngine({
      gridSize: 5,
      stepMs: 100,
      initialSnake: [
        { x: 2, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 2 }
      ],
      initialDirection: DIRECTIONS.Right,
      seed: 'reverse-test'
    });

    engine.setDirection(DIRECTIONS.Right);
    engine.tick(100);
    const afterMove = engine.getState();

    engine.setDirection(DIRECTIONS.Left);
    const afterReverseAttempt = engine.getState();

    expect(afterReverseAttempt.pendingDirection).toEqual(afterMove.direction);
  });

  it('serializes and restores state including RNG progression', () => {
    const engine = new SnakeGameEngine({
      gridSize: 6,
      stepMs: 100,
      initialSnake: [{ x: 0, y: 0 }],
      initialFood: { x: 1, y: 0 },
      seed: 'serialize-test'
    });

    engine.setDirection(DIRECTIONS.Right);
    engine.tick(100);
    engine.setDirection(DIRECTIONS.Down);
    engine.tick(100);

    const serialized = engine.serialize();
    const clone = new SnakeGameEngine();
    clone.load(serialized);

    expect(clone.getState()).toEqual(engine.getState());

    engine.tick(100);
    clone.tick(100);

    expect(clone.getState()).toEqual(engine.getState());
  });
});
