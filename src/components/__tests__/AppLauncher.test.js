import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppLauncher from '../AppLauncher';
import {
  readGlobalGistSettings,
  subscribeToGlobalGistSettings,
  writeGlobalGistSettings,
} from '../../state/globalGistSettings';

jest.mock('../../apps/registry', () => {
  const mockApps = [
    {
      id: 'alpha-app',
      title: 'Alpha App',
      description: 'Plan alpha level productivity tasks',
      icon: '🅰️',
      category: 'Productivity',
      tags: ['alpha', 'tasks'],
      version: '1.0.0',
      featured: true,
      path: '/apps/alpha',
    },
    {
      id: 'beta-game',
      title: 'Beta Game',
      description: 'Battle friends in a vibrant beta arena',
      icon: '🅱️',
      category: 'Games',
      tags: ['beta', 'arcade'],
      version: '1.0.0',
      featured: false,
      path: '/apps/beta',
    },
    {
      id: 'gamma-utility',
      title: 'Gamma Utility',
      description: 'Tune gamma rays with ease',
      icon: '🌀',
      category: 'Utilities',
      tags: ['gamma', 'tool'],
      version: '1.0.0',
      featured: false,
      path: '/apps/gamma',
    },
  ];

  const mockGetAllApps = jest.fn(() => mockApps);

  return {
    __esModule: true,
    APP_CATEGORIES: {
      Productivity: { icon: '⚡' },
      Games: { icon: '🎮' },
      Utilities: { icon: '🛠️' },
    },
    getAllApps: mockGetAllApps,
  };
});

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../state/globalGistSettings', () => {
  const readMock = jest.fn();
  const subscribeMock = jest.fn();
  const writeMock = jest.fn();

  return {
    __esModule: true,
    readGlobalGistSettings: readMock,
    subscribeToGlobalGistSettings: subscribeMock,
    writeGlobalGistSettings: writeMock,
  };
});

const renderLauncher = () => {
  return render(
    <MemoryRouter>
      <AppLauncher />
    </MemoryRouter>
  );
};

const getAppsContainerForHeading = (headingMatcher) => {
  const heading = screen.getByRole('heading', { name: headingMatcher });
  const section = heading.closest('section');

  if (!section) {
    throw new Error(`Section not found for heading: ${headingMatcher}`);
  }

  const container = section.querySelector('.apps-container');

  if (!container) {
    throw new Error(`Apps container not found for heading: ${headingMatcher}`);
  }

  return container;
};

describe('AppLauncher', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    window.localStorage.clear();
    readGlobalGistSettings.mockImplementation(() => ({
      gistId: 'initial-id',
      gistToken: 'initial-token',
    }));
    subscribeToGlobalGistSettings.mockImplementation(() => jest.fn());
    writeGlobalGistSettings.mockClear();
  });

  it('filters apps by search query', async () => {
    renderLauncher();
    const user = userEvent.setup();

    const searchInput = screen.getByPlaceholderText('Search apps...');
    await user.type(searchInput, 'gamma');

    const allAppsContainer = getAppsContainerForHeading(/All Apps/);

    expect(within(allAppsContainer).getByText('Gamma Utility')).toBeInTheDocument();
    expect(within(allAppsContainer).queryByText('Alpha App')).not.toBeInTheDocument();
    expect(within(allAppsContainer).queryByText('Beta Game')).not.toBeInTheDocument();
  });

  it('filters apps by category selection', async () => {
    renderLauncher();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Games/i }));

    const gamesContainer = getAppsContainerForHeading(/Games Apps/);

    expect(within(gamesContainer).getByText('Beta Game')).toBeInTheDocument();
    expect(within(gamesContainer).queryByText('Gamma Utility')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Games Apps \(1\)/ })).toBeInTheDocument();
  });

  it('toggles favourites and persists them', async () => {
    renderLauncher();
    const user = userEvent.setup();

    const allAppsContainer = getAppsContainerForHeading(/All Apps/);
    const alphaCard = within(allAppsContainer).getByText('Alpha App').closest('.app-card');

    if (!alphaCard) {
      throw new Error('Alpha App card not found in main list');
    }

    const favoriteButton = within(alphaCard).getByRole('button', { name: 'Favorite app' });
    await user.click(favoriteButton);

    expect(favoriteButton).toHaveTextContent('★');
    expect(within(alphaCard).getByText('★ Favorited')).toBeInTheDocument();
    expect(window.localStorage.getItem('favoriteAppIds')).toBe(JSON.stringify(['alpha-app']));
  });

  it('handles settings updates and closing actions', async () => {
    subscribeToGlobalGistSettings.mockClear();
    const unsubscribeMock = jest.fn();
    subscribeToGlobalGistSettings.mockImplementation((callback) => {
      callback({ gistId: 'subscribed-id', gistToken: 'subscribed-token' });
      return unsubscribeMock;
    });

    renderLauncher();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Settings/i }));

    const gistIdInput = await screen.findByLabelText('Gist ID');
    expect(gistIdInput).toHaveValue('subscribed-id');

    const gistTokenInput = screen.getByLabelText('Personal Access Token');
    await user.clear(gistIdInput);
    await user.type(gistIdInput, 'new-gist');
    await user.clear(gistTokenInput);
    await user.type(gistTokenInput, 'new-token');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(writeGlobalGistSettings).toHaveBeenCalledWith({
      gistId: 'new-gist',
      gistToken: 'new-token',
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(unsubscribeMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Settings/i }));

    const gistIdInputAfterReopen = await screen.findByLabelText('Gist ID');
    await user.clear(gistIdInputAfterReopen);
    await user.type(gistIdInputAfterReopen, 'temp-id');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(writeGlobalGistSettings).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Settings/i }));

    const gistIdAfterCancel = await screen.findByLabelText('Gist ID');
    expect(gistIdAfterCancel).toHaveValue('initial-id');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
  });
});
