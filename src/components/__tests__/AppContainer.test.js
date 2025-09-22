import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import App from '../../App';

const renderAtPath = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <App />
  </MemoryRouter>
);

describe('App routing', () => {
  it('loads the Day Switcher app when navigating directly to its route', async () => {
    renderAtPath('/apps/day-switcher');

    expect(await screen.findByText(/Day 1 of 7/i)).toBeInTheDocument();
  });

  it('preserves the active app when the page is refreshed', async () => {
    const appPath = '/apps/day-switcher';

    const firstRender = renderAtPath(appPath);
    expect(await screen.findByText(/Day 1 of 7/i)).toBeInTheDocument();
    firstRender.unmount();

    renderAtPath(appPath);
    expect(await screen.findByText(/Day 1 of 7/i)).toBeInTheDocument();
  });

  it('loads Cat Connect Four with the café background asset', async () => {
    renderAtPath('/apps/cat-connect-four');

    await screen.findByRole('heading', { name: /Cat Connect Four/i });

    await screen.findByText(/Relax at the cat café/i);

    const appElement = document.querySelector('.cat-connect-four-app');
    expect(appElement).not.toBeNull();
    expect(appElement.style.backgroundImage).toContain('/cat-connect-four/cat-cafe-illustration.svg');
  });
});
