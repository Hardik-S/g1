import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PongApp from '../PongApp';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('PongApp component', () => {
  let container;
  let root;
  let rafSpy;
  let cafSpy;
  let getContextSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);

    const mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      setLineDash: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn(),
    };

    getContextSpy = jest
      .spyOn(window.HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(mockContext);

    rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => setTimeout(() => callback(Date.now()), 16));
    cafSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle => {
      clearTimeout(handle);
    });
  });

  afterEach(() => {
    act(() => {
      if (root) {
        root.unmount();
        root = null;
      }
    });
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    jest.useRealTimers();
    rafSpy.mockRestore();
    cafSpy.mockRestore();
    getContextSpy.mockRestore();
  });

  it('renders the scoreboard and instructions', () => {
    act(() => {
      root = createRoot(container);
      root.render(<PongApp />);
    });

    act(() => {
      jest.advanceTimersByTime(48);
    });

    const scoreLabels = Array.from(container.querySelectorAll('.pong-app__score span')).map(el =>
      el.textContent.trim(),
    );
    expect(scoreLabels).toEqual(['Player 1', expect.any(String)]);

    const note = container.querySelector('.pong-app__note');
    expect(note).not.toBeNull();
    expect(note.textContent).toContain('Controls');
  });
});
