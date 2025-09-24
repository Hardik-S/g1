import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../../components/MiniTimerWindow', () => {
  const React = require('react');
  const mockWindow = {
    focus: jest.fn(),
    closed: false
  };

  const MiniTimerWindowMock = (props) => {
    const propsRef = React.useRef(props);
    propsRef.current = props;

    React.useEffect(() => {
      MiniTimerWindowMock.propsRef = propsRef;
      mockWindow.closed = false;
      if (MiniTimerWindowMock.shouldBlock) {
        propsRef.current.onBlocked?.();
        return undefined;
      }
      propsRef.current.onOpen?.(mockWindow);
      return () => {
        MiniTimerWindowMock.propsRef = null;
        propsRef.current.onClose?.();
      };
    }, []);

    return <div data-testid="mock-mini-window">{props.children}</div>;
  };

  MiniTimerWindowMock.mockWindow = mockWindow;
  MiniTimerWindowMock.propsRef = null;
  MiniTimerWindowMock.shouldBlock = false;
  MiniTimerWindowMock.close = () => {
    mockWindow.closed = true;
    MiniTimerWindowMock.propsRef?.current?.onClose?.();
  };
  MiniTimerWindowMock.block = () => {
    MiniTimerWindowMock.propsRef?.current?.onBlocked?.();
  };
  MiniTimerWindowMock.reset = () => {
    mockWindow.focus = jest.fn();
    mockWindow.closed = false;
    MiniTimerWindowMock.shouldBlock = false;
    MiniTimerWindowMock.propsRef = null;
  };

  return { __esModule: true, default: MiniTimerWindowMock };
});

import NPomodoroApp from '../NPomodoroApp';
import MiniTimerWindow from '../../../components/MiniTimerWindow';

describe('NPomodoroApp interactions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    });
    MiniTimerWindow.reset();
  });

  it('toggles focus mode when the focus session button is used', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const sessionPreviews = screen.getAllByTestId('session-preview');
    await user.click(sessionPreviews[0]);

    const editor = screen.getByTestId('session-editor-modal');
    const focusButton = within(editor).getByRole('button', {
      name: /focus session/i
    });

    await user.click(focusButton);

    expect(screen.getByTestId('focus-mode-overlay')).toBeInTheDocument();
    expect(focusButton).toHaveTextContent(/exit focus/i);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('focus-mode-overlay')).not.toBeInTheDocument();
    });
    expect(focusButton).toHaveTextContent(/focus session/i);

    const closeButton = within(editor).getByRole('button', {
      name: /close session editor/i
    });
    await user.click(closeButton);
  });

  it('removes a session when the remove button is pressed', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const sessionPreviews = screen.getAllByTestId('session-preview');
    const secondSession = sessionPreviews[1];
    expect(within(secondSession).getByText(/midday flow/i)).toBeInTheDocument();

    await user.click(secondSession);

    const editor = screen.getByTestId('session-editor-modal');
    const removeButton = within(editor).getByRole('button', { name: /remove session/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText(/midday flow/i)).not.toBeInTheDocument();
    });
  });

  it('adds a new block to the selected session', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const sessionPreviews = screen.getAllByTestId('session-preview');
    await user.click(sessionPreviews[0]);

    const editor = screen.getByTestId('session-editor-modal');
    const initialBlocks = within(editor).getAllByTestId('block-row');
    const addBlockButton = within(editor).getByRole('button', {
      name: /\+ add block/i
    });

    await user.click(addBlockButton);

    await waitFor(() => {
      const updatedEditor = screen.getByTestId('session-editor-modal');
      const updatedBlocks = within(updatedEditor).getAllByTestId('block-row');
      expect(updatedBlocks).toHaveLength(initialBlocks.length + 1);
    });
  });

  it('opens the mini timer window and focuses it on repeat clicks', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const popoutButton = screen.getByRole('button', { name: /mini timer window/i });
    MiniTimerWindow.mockWindow.focus = jest.fn();

    await user.click(popoutButton);
    expect(screen.getByTestId('mock-mini-window')).toBeInTheDocument();
    expect(popoutButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(popoutButton);
    expect(MiniTimerWindow.mockWindow.focus).toHaveBeenCalledTimes(1);
  });

  it('resets the popout state when the mini window closes', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const popoutButton = screen.getByRole('button', { name: /mini timer window/i });

    await user.click(popoutButton);
    expect(popoutButton).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      MiniTimerWindow.close();
    });

    await waitFor(() => {
      expect(popoutButton).toHaveAttribute('aria-pressed', 'false');
    });

    await user.click(popoutButton);
    expect(screen.getByTestId('mock-mini-window')).toBeInTheDocument();
  });
});
