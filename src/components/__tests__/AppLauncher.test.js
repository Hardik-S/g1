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

jest.mock('../../state/globalGistSettings', () => ({
  __esModule: true,
  readGlobalGistSettings: jest.fn(() => ({ gistId: '', gistToken: '' })),
  subscribeToGlobalGistSettings: jest.fn(() => jest.fn()),
  writeGlobalGistSettings: jest.fn(),
}));

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

const renderAppLauncher = () => render(
  <MemoryRouter>
    <AppLauncher />
  </MemoryRouter>,
);

describe('AppLauncher', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    getAllApps.mockReset();
  });

  it('renders favorite apps before non-favorites', () => {
    getAllApps.mockReturnValue([
      createApp({ id: 'alpha-app', title: 'Alpha App', tags: ['alpha'], category: 'Productivity' }),
      createApp({ id: 'beta-app', title: 'Beta App', tags: ['beta'], category: 'Productivity' }),
      createApp({ id: 'gamma-app', title: 'Gamma App', tags: ['gamma'], category: 'Productivity' }),
    ]);

    localStorage.setItem('favoriteAppIds', JSON.stringify(['beta-app']));

    renderAppLauncher();

    const appsSection = screen.getByText(/All Apps/).closest('section');
    expect(appsSection).not.toBeNull();

    const titles = within(appsSection).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

    expect(titles).toEqual(['Beta App', 'Alpha App', 'Gamma App']);
  });

  describe('categories', () => {
    beforeEach(() => {
      getAllApps.mockReset();
    });

    it('renders categories derived from available apps', () => {
      getAllApps.mockReturnValue([
        createApp({ id: 'game-app', title: 'Game App', category: 'Games' }),
        createApp({ id: 'custom-app', title: 'Space Magic', category: 'Space Magic' }),
      ]);

      renderAppLauncher();

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Games/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Space Magic' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Utilities/i })).not.toBeInTheDocument();
    });

    it('keeps the All category active when toggled with no apps', async () => {
      getAllApps.mockReturnValue([]);
      const user = userEvent.setup();

      const { container } = renderAppLauncher();

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
});
