import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppErrorBoundary from '../AppErrorBoundary';

describe('AppErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders an error state when a lazy loader rejects', async () => {
    const LazyFailure = React.lazy(() =>
      Promise.resolve().then(() => {
        throw new Error('loader failed');
      })
    );

    const onRetry = jest.fn();
    const onBack = jest.fn();

    render(
      <AppErrorBoundary onRetry={onRetry} onBack={onBack}>
        <Suspense fallback={<div>loading...</div>}>
          <LazyFailure />
        </Suspense>
      </AppErrorBoundary>
    );

    expect(await screen.findByRole('heading', { name: /couldn't load this app/i })).toBeVisible();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    const backButton = screen.getByRole('button', { name: /back to apps/i });

    expect(retryButton).toBeEnabled();
    expect(backButton).toBeEnabled();

    const user = userEvent.setup();
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
