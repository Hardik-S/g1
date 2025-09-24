import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NPomodoroApp from '../NPomodoroApp';

class PopupWindowStub {
  constructor() {
    this.closed = false;
    this.focus = jest.fn();
    this.listeners = new Map();
    this.document = document.implementation.createHTMLDocument('mini');
    this.opener = window;
    Object.defineProperty(this.document, 'readyState', {
      configurable: true,
      get: () => 'complete'
    });
  }

  addEventListener(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
  }

  removeEventListener(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (!handlers.size) {
      this.listeners.delete(eventName);
    }
  }

  dispatch(eventName) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.forEach((handler) => handler());
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.dispatch('beforeunload');
  }
}

describe('NPomodoroApp interactions', () => {
  const originalTitle = document.title;
  let openSpy;
  let lastPopup;

  beforeEach(() => {
    window.localStorage.clear();
    document.title = originalTitle;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    });
    lastPopup = null;
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => {
      lastPopup = new PopupWindowStub();
      return lastPopup;
    });
  });

  afterEach(async () => {
    if (openSpy) {
      openSpy.mockRestore();
    }
    if (lastPopup && !lastPopup.closed) {
      await act(async () => {
        lastPopup.close();
      });
    }
  });

  const openMiniWindow = async (user) => {
    const popoutButton = screen.getByRole('button', { name: /mini timer window/i });
    await user.click(popoutButton);
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(lastPopup?.document.body.querySelector('.mini-timer-window-root')).toBeTruthy();
    });
    return { popoutButton, popup: lastPopup };
  };

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

  it('opens the mini timer window via window.open and focuses existing popups', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const { popoutButton, popup } = await openMiniWindow(user);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, name, features] = openSpy.mock.calls[0];
    expect(url).toBe('');
    expect(name).toBe('n-pomodoro-mini-timer');
    expect(features).toContain('width=360');
    expect(features).toContain('height=520');
    expect(features).not.toContain('noopener=yes');
    expect(popup.opener).toBeNull();
    expect(popoutButton).toHaveAttribute('aria-pressed', 'true');
    expect(popup.focus).toHaveBeenCalled();

    await user.click(popoutButton);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(popup.focus).toHaveBeenCalledTimes(2);
  });

  it('renders the mini timer content inside the popup portal', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    await openMiniWindow(user);

    await waitFor(() => {
      const miniCard = lastPopup.document.body.querySelector('.timer-card[data-variant="mini"]');
      expect(miniCard).toBeTruthy();
      expect(miniCard.textContent).toContain('Session 1 of');
    });
  });

  it('keeps timer values in sync between the main view and the popup', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const mainTimeDisplay = document.querySelector('.play-panel .time-display');
    expect(mainTimeDisplay).not.toBeNull();

    await openMiniWindow(user);

    await waitFor(() => {
      const popupTimeDisplay = lastPopup.document.querySelector('.time-display');
      expect(popupTimeDisplay).toBeTruthy();
      expect(popupTimeDisplay.textContent).toBe(mainTimeDisplay.textContent);
    });
  });

  it('resets the popout state when the mini window closes itself', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const { popoutButton, popup } = await openMiniWindow(user);
    expect(popoutButton).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      popup.close();
    });

    await waitFor(() => {
      expect(popoutButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('closes the popup when the provider resets to defaults', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const { popoutButton, popup } = await openMiniWindow(user);
    expect(popup.closed).toBe(false);

    const restoreButton = screen.getByRole('button', { name: /restore defaults/i });
    await user.click(restoreButton);

    await waitFor(() => {
      expect(popoutButton).toHaveAttribute('aria-pressed', 'false');
      expect(popup.closed).toBe(true);
    });
  });

  it('persists session edits after using the mini window and remounting', async () => {
    const { unmount } = render(<NPomodoroApp />);
    const user = userEvent.setup();

    const sessionPreviews = screen.getAllByTestId('session-preview');
    await user.click(sessionPreviews[0]);

    const editor = screen.getByTestId('session-editor-modal');
    const nameInput = within(editor).getByDisplayValue('Morning Momentum');
    await user.clear(nameInput);
    await user.type(nameInput, 'Persistent Focus');

    await waitFor(() => {
      const stored = window.localStorage.getItem('n-pomodoro-sessions-v2');
      expect(stored).toContain('Persistent Focus');
    });

    const closeButton = within(editor).getByRole('button', {
      name: /close session editor/i
    });
    await user.click(closeButton);

    const { popup } = await openMiniWindow(user);
    expect(popup.closed).toBe(false);

    await act(async () => {
      unmount();
    });

    expect(popup.closed).toBe(true);

    render(<NPomodoroApp />);
    expect(screen.getAllByText('Persistent Focus')[0]).toBeInTheDocument();
  });
});
