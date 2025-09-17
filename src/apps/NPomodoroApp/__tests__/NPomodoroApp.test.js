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

    const sessionCards = screen.getAllByTestId('session-card');
    const focusButton = within(sessionCards[0]).getByRole('button', {
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
  });

  it('removes a session when the remove button is pressed', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const sessionCards = screen.getAllByTestId('session-card');
    const secondSession = sessionCards[1];
    expect(within(secondSession).getByDisplayValue(/midday flow/i)).toBeInTheDocument();

    const removeButton = within(secondSession).getByRole('button', { name: /remove/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByDisplayValue(/midday flow/i)).not.toBeInTheDocument();
    });
  });

  it('adds a new block to the selected session', async () => {
    render(<NPomodoroApp />);
    const user = userEvent.setup();

    const initialSessionCard = screen.getAllByTestId('session-card')[0];
    const initialBlocks = within(initialSessionCard).getAllByTestId('block-row');
    const addBlockButton = within(initialSessionCard).getByRole('button', {
      name: /\+ add block/i
    });

    await user.click(addBlockButton);

    await waitFor(() => {
      const updatedSessionCard = screen.getAllByTestId('session-card')[0];
      const updatedBlocks = within(updatedSessionCard).getAllByTestId('block-row');
      expect(updatedBlocks).toHaveLength(initialBlocks.length + 1);
    });
  });
});
