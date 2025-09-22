import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLauncher from '../AppLauncher';
import { getAllApps } from '../../apps/registry';

jest.mock('../../apps/registry', () => {
  const actual = jest.requireActual('../../apps/registry');
  return {
    ...actual,
    getAllApps: jest.fn(),
  };
});

const createApp = (overrides = {}) => ({
  id: 'test-app',
  title: 'Test App',
  description: 'Test description',
  icon: '🧪',
  category: 'Games',
  path: '/apps/test-app',
  tags: [],
  featured: false,
  version: '1.0.0',
  disabled: false,
  ...overrides,
});

describe('AppLauncher categories', () => {
  beforeEach(() => {
    localStorage.clear();
    getAllApps.mockReset();
  });

  it('renders categories derived from available apps', () => {
    getAllApps.mockReturnValue([
      createApp({ id: 'game-app', title: 'Game App', category: 'Games' }),
      createApp({ id: 'custom-app', title: 'Space Magic', category: 'Space Magic' }),
    ]);

    render(
      <MemoryRouter>
        <AppLauncher />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Games/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Space Magic' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Utilities/i })).not.toBeInTheDocument();
  });

  it('keeps the All category active when toggled with no apps', async () => {
    getAllApps.mockReturnValue([]);
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <AppLauncher />
      </MemoryRouter>,
    );

    const nav = container.querySelector('.category-nav');
    expect(nav).not.toBeNull();

    const allButton = within(nav).getByRole('button', { name: 'All' });
    expect(allButton).toHaveClass('active');

    await user.click(allButton);

    expect(allButton).toHaveClass('active');
    expect(within(nav).queryByRole('button', { name: /Games/i })).toBeNull();
    expect(screen.getByText(/No apps found/i)).toBeInTheDocument();
  });
});
