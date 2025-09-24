import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SnakeCreativeApp from '../SnakeCreativeApp';

describe('SnakeCreativeApp', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      writable: true,
      value: () => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        translate: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        createLinearGradient: () => ({ addColorStop: jest.fn() }),
        createRadialGradient: () => ({ addColorStop: jest.fn() }),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        strokeRect: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        globalAlpha: 1,
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: ''
      })
    });
  });

  it('renders default neon theme and session metrics', () => {
    render(<SnakeCreativeApp />);

    expect(screen.getByRole('heading', { name: 'Snake 2.0' })).toBeInTheDocument();
    expect(screen.getByText(/Creative neon-to-garden-to-minimal reinterpretation/i)).toBeInTheDocument();
    expect(screen.getAllByText('Score')[0]).toBeInTheDocument();
    expect(screen.getAllByText('High')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Combo')[0]).toBeInTheDocument();
  });

  it('allows switching themes and multiplayer mode', () => {
    render(<SnakeCreativeApp />);

    fireEvent.click(screen.getByRole('button', { name: /Organic Garden/i }));
    expect(screen.getByText(/Lush garden canopy/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Multiplayer/i }));
    expect(screen.getByText(/Player Two/, { selector: '.player-name' })).toBeInTheDocument();
  });
});
