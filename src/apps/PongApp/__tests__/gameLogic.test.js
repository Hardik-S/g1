import {
  createInitialState,
  createInputState,
  stepGame,
  DEFAULT_OPTIONS,
} from '../gameLogic';

describe('pong game logic', () => {
  it('creates a centred ball that is already moving toward the opponent', () => {
    const state = createInitialState();
    expect(state.ball.x).toBeCloseTo(DEFAULT_OPTIONS.width / 2, 5);
    expect(state.ball.y).toBeCloseTo(DEFAULT_OPTIONS.height / 2, 5);
    expect(state.ball.vx).toBeGreaterThan(0);
    expect(Math.abs(state.ball.vy)).toBeGreaterThan(0);
  });

  it('moves paddles according to player input and clamps them within bounds', () => {
    const state = createInitialState();
    const input = createInputState({ left: -1, usesAi: false, right: 0 });

    const { state: movedUp } = stepGame(state, input, 0.016);
    expect(movedUp.paddles.left.y).toBeLessThan(state.paddles.left.y);

    let current = movedUp;
    for (let i = 0; i < 120; i += 1) {
      const step = stepGame(current, input, 0.016);
      current = step.state;
    }
    expect(current.paddles.left.y).toBeGreaterThanOrEqual(0);

    const moveDownInput = createInputState({ left: 1, usesAi: false, right: 0 });
    current.paddles.left.y = DEFAULT_OPTIONS.height - DEFAULT_OPTIONS.paddleHeight - 2;
    const { state: movedDown } = stepGame(current, moveDownInput, 0.016);
    expect(movedDown.paddles.left.y).toBeLessThanOrEqual(
      DEFAULT_OPTIONS.height - DEFAULT_OPTIONS.paddleHeight,
    );
  });

  it('toggles pause mode when requested and halts motion while paused', () => {
    const initial = createInitialState();
    const pauseInput = createInputState();
    pauseInput.pausePressed = true;

    const paused = stepGame(initial, pauseInput, 0.016);
    expect(paused.state.isPaused).toBe(true);
    expect(paused.events).toContainEqual({ type: 'pause', isPaused: true });

    const followUp = stepGame(paused.state, createInputState(), 0.5);
    expect(followUp.state.ball.x).toBeCloseTo(paused.state.ball.x);
    expect(followUp.state.ball.y).toBeCloseTo(paused.state.ball.y);
  });

  it('awards points and re-centres the ball when it crosses a boundary', () => {
    const state = createInitialState();
    state.ball.x = state.bounds.width + state.ball.radius + 4;
    state.ball.vx = Math.abs(state.ball.vx) + 80;
    state.ball.vy = 0;

    const result = stepGame(state, createInputState(), 0.2);
    const scoreEvent = result.events.find(event => event.type === 'score');
    expect(scoreEvent).toBeDefined();
    expect(scoreEvent.side).toBe('left');
    expect(result.state.scores.left).toBe(1);
    expect(result.state.ball.x).toBeCloseTo(state.bounds.width / 2, 5);
    expect(result.state.ball.vx).toBeGreaterThan(0);
  });

  it('allows the AI paddle to track the ball position', () => {
    const state = createInitialState();
    state.ball.y = 12;
    state.paddles.right.y = DEFAULT_OPTIONS.height / 2;

    const { state: nextState } = stepGame(state, createInputState(), 0.05);
    expect(nextState.paddles.right.y).toBeLessThan(state.paddles.right.y);
  });

  it('does not mutate the previous state object', () => {
    const state = createInitialState();
    const snapshot = JSON.parse(JSON.stringify(state));
    const input = createInputState();

    const result = stepGame(state, input, 0.016);
    expect(state).toEqual(snapshot);
    expect(result.state).not.toBe(state);
    expect(result.state.paddles.left).not.toBe(state.paddles.left);
    expect(result.state.ball).not.toBe(state.ball);
  });
});
