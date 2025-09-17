import {
  createInitialState,
  createInputState,
  stepGame,
  DEFAULT_OPTIONS,
} from '../gameLogic';

describe('pong game logic', () => {
  it('creates a centred ball that is already moving toward the opponent', () => {
    const state = createInitialState();
    const [ball] = state.balls;
    expect(ball.x).toBeCloseTo(DEFAULT_OPTIONS.width / 2, 5);
    expect(ball.y).toBeCloseTo(DEFAULT_OPTIONS.height / 2, 5);
    expect(ball.vx).toBeGreaterThan(0);
    expect(Math.abs(ball.vy)).toBeGreaterThan(0);
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
    const pausedBall = paused.state.balls[0];
    const followUpBall = followUp.state.balls[0];
    expect(followUpBall.x).toBeCloseTo(pausedBall.x);
    expect(followUpBall.y).toBeCloseTo(pausedBall.y);
  });

  it('awards points and re-centres the ball when it crosses a boundary', () => {
    const state = createInitialState();
    const ball = state.balls[0];
    ball.x = state.bounds.width + ball.radius + 4;
    ball.vx = Math.abs(ball.vx) + 80;
    ball.vy = 0;

    const result = stepGame(state, createInputState(), 0.2);
    const scoreEvent = result.events.find(event => event.type === 'score');
    expect(scoreEvent).toBeDefined();
    expect(scoreEvent.side).toBe('left');
    expect(result.state.scores.left).toBe(1);
    const [servedBall] = result.state.balls;
    expect(servedBall.x).toBeCloseTo(state.bounds.width / 2, 5);
    expect(servedBall.vx).toBeGreaterThan(0);
  });

  it('allows the AI paddle to track the ball position', () => {
    const state = createInitialState();
    state.balls[0].y = 12;
    state.paddles.right.y = DEFAULT_OPTIONS.height / 2;

    const { state: nextState } = stepGame(state, createInputState(), 0.05);
    expect(nextState.paddles.right.y).toBeLessThan(state.paddles.right.y);
  });

  it('spawns additional balls after five paddle bounces in Krazy mode', () => {
    let current = createInitialState({ krazyMode: true });
    const input = createInputState({ usesAi: false, right: 0 });

    const positionBallForBounce = (state, side) => {
      const [ball] = state.balls;
      const { paddles, options } = state;
      ball.y = paddles[side].y + options.paddleHeight / 2;
      ball.vy = 0;
      ball.speed = options.ballSpeed;
      if (side === 'left') {
        ball.x = paddles.left.x + options.paddleWidth + ball.radius + 1;
        ball.vx = -options.ballSpeed;
      } else {
        ball.x = paddles.right.x - ball.radius - 1;
        ball.vx = options.ballSpeed;
      }
    };

    ['right', 'left', 'right', 'left', 'right'].forEach(side => {
      positionBallForBounce(current, side);
      const step = stepGame(current, input, 0.016);
      current = step.state;
    });

    expect(current.balls.length).toBeGreaterThan(1);
    expect(current.successfulPasses).toBeGreaterThanOrEqual(5);
  });

  it('ends the game when a player reaches the win score', () => {
    const state = createInitialState();
    state.scores.left = state.options.winScore - 1;
    const ball = state.balls[0];
    ball.x = state.bounds.width + ball.radius + 4;
    ball.vx = Math.abs(ball.vx) + 100;
    ball.vy = 0;

    const result = stepGame(state, createInputState(), 0.2);
    const winEvent = result.events.find(event => event.type === 'win');
    expect(winEvent).toBeDefined();
    expect(result.state.scores.left).toBe(state.options.winScore);
    expect(result.state.winner).toBe('left');
    expect(result.state.isPaused).toBe(true);
    expect(result.state.balls).toHaveLength(0);
  });

  it('does not mutate the previous state object', () => {
    const state = createInitialState();
    const snapshot = JSON.parse(JSON.stringify(state));
    const input = createInputState();

    const result = stepGame(state, input, 0.016);
    expect(state).toEqual(snapshot);
    expect(result.state).not.toBe(state);
    expect(result.state.paddles.left).not.toBe(state.paddles.left);
    expect(result.state.balls[0]).not.toBe(state.balls[0]);
  });
});
