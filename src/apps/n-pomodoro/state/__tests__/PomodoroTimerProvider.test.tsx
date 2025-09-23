import React from 'react';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react';
import {
  PomodoroTimerProvider,
  usePomodoroTimer
} from '../PomodoroTimerProvider';

describe('PomodoroTimerProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <PomodoroTimerProvider>{children}</PomodoroTimerProvider>
  );

  it('renders consumers with the default timer data', () => {
    const TestConsumer = () => {
      const { sessions, timeLeft, isRunning } = usePomodoroTimer();
      return (
        <div>
          <span data-testid="session-count">{sessions.length}</span>
          <span data-testid="time-left">{timeLeft}</span>
          <span data-testid="is-running">{isRunning ? 'running' : 'idle'}</span>
        </div>
      );
    };

    render(
      <PomodoroTimerProvider>
        <TestConsumer />
      </PomodoroTimerProvider>
    );

    expect(screen.getByTestId('session-count')).toHaveTextContent('3');
    expect(screen.getByTestId('time-left')).toHaveTextContent('1800');
    expect(screen.getByTestId('is-running')).toHaveTextContent('idle');
  });

  it('counts down over time and advances to the next block', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => usePomodoroTimer(), { wrapper });

    act(() => {
      const firstSession = result.current.sessions[0];
      const firstBlock = firstSession.blocks[0];
      result.current.updateBlock(firstSession.id, firstBlock.id, { minutes: 1 });
    });

    expect(result.current.timeLeft).toBe(60);

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.timeLeft).toBe(59);

    act(() => {
      jest.advanceTimersByTime(59 * 1000);
    });

    expect(result.current.currentBlockIndex).toBe(1);
    expect(result.current.timeLeft).toBe(
      (result.current.currentBlock?.minutes ?? 0) * 60
    );
  });

  it('persists session changes to localStorage', async () => {
    const { result } = renderHook(() => usePomodoroTimer(), { wrapper });

    act(() => {
      result.current.addSession();
    });

    await waitFor(() => {
      const stored = window.localStorage.getItem('n-pomodoro-sessions-v2');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored as string);
      expect(parsed).toHaveLength(result.current.sessions.length);
    });
  });
});
