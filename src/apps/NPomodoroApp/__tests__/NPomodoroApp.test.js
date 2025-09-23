import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NPomodoroApp from '../NPomodoroApp';

describe('NPomodoroApp interactions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    });
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
});
