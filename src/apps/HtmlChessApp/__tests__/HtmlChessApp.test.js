import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HtmlChessApp from '../HtmlChessApp';

describe('HtmlChessApp', () => {
  it('renders the header and load button', () => {
    render(<HtmlChessApp />);

    expect(screen.getByRole('heading', { name: /html chess lab/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load stockfish/i })).toBeEnabled();
    expect(
      screen.getByText(/Load the Stockfish 17 engine compiled to WebAssembly/i),
    ).toBeInTheDocument();
  });

  it('allows updating the command textarea', () => {
    render(<HtmlChessApp />);

    const textarea = screen.getByDisplayValue('position startpos');

    fireEvent.change(textarea, { target: { value: 'uci' } });

    expect(textarea).toHaveValue('uci');
  });
});
