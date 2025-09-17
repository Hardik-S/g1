import {
  createInitialState,
  createInputState,
  stepGame,
  normalizeAngle,
} from '../gameLogic';

describe('CirclePong game logic', () => {
  test('player paddles stay within their half-circle range', () => {
    const state = createInitialState({ mode: 'versus' });
    const input = createInputState();
    input.player1 = 1;
    for (let i = 0; i < 200; i += 1) {
      stepGame(state, input, 0.016);
    }
    const p1Range = state.ranges.player1;
    expect(normalizeAngle(state.paddles.player1.angle)).toBeLessThanOrEqual(normalizeAngle(p1Range.end) + 1e-6);

    input.player1 = -1;
    for (let i = 0; i < 200; i += 1) {
      stepGame(state, input, 0.016);
    }
    expect(normalizeAngle(state.paddles.player1.angle)).toBeGreaterThanOrEqual(normalizeAngle(p1Range.start) - 1e-6);
  });

  test('ball reflects when striking a paddle arc', () => {
    const state = createInitialState({ mode: 'versus' });
    state.paddles.player1.angle = Math.PI; // centered on left side
    state.ball.x = state.center.x - (state.options.radius - state.options.ballRadius - 1);
    state.ball.y = state.center.y;
    state.ball.vx = -state.options.ballSpeed;
    state.ball.vy = 0;

    stepGame(state, createInputState(), 0.016);

    expect(state.ball.vx).toBeGreaterThan(0);
    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    expect(speed).toBeCloseTo(state.options.ballSpeed, 3);
  });

  test('missing a paddle awards a point to the opponent', () => {
    const state = createInitialState({ mode: 'versus' });
    state.paddles.player1.angle = normalizeAngle(state.ranges.player1.end); // bottom of arc

    const missAngle = (Math.PI / 2) + 0.4;
    const distance = state.options.radius - state.options.ballRadius - 0.5;
    state.ball.x = state.center.x + Math.cos(missAngle) * distance;
    state.ball.y = state.center.y + Math.sin(missAngle) * distance;
    state.ball.vx = Math.cos(missAngle) * state.options.ballSpeed;
    state.ball.vy = Math.sin(missAngle) * state.options.ballSpeed;

    const events = stepGame(state, createInputState(), 0.016);
    expect(state.scores.player2).toBe(1);
    expect(events.some(event => event.type === 'score' && event.scorer === 'player2')).toBe(true);
  });

  test('reaching three points triggers a win condition', () => {
    const state = createInitialState({ mode: 'versus' });
    state.scores.player1 = 2;
    state.paddles.player2.angle = normalizeAngle(state.ranges.player2.start);

    const missAngle = 0.3;
    const distance = state.options.radius - state.options.ballRadius - 0.5;
    state.ball.x = state.center.x + Math.cos(missAngle) * distance;
    state.ball.y = state.center.y + Math.sin(missAngle) * distance;
    state.ball.vx = Math.cos(missAngle) * state.options.ballSpeed;
    state.ball.vy = Math.sin(missAngle) * state.options.ballSpeed;

    const events = stepGame(state, createInputState(), 0.016);

    expect(state.winner).toBe('player1');
    expect(state.isRunning).toBe(false);
    expect(events.some(event => event.type === 'win' && event.winner === 'player1')).toBe(true);
  });
});
