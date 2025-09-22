import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AppLauncher from '../AppLauncher';

jest.mock('../../apps/registry', () => {
  const mockApps = [
    {
      id: 'alpha-app',
      title: 'Alpha App',
      description: 'Alpha description',
      icon: '🅰️',
      category: 'Productivity',
      path: '/apps/alpha',
      tags: ['alpha'],
      version: '1.0.0',
      featured: false,
      disabled: false,
    },
    {
      id: 'beta-app',
      title: 'Beta App',
      description: 'Beta description',
      icon: '🅱️',
      category: 'Productivity',
      path: '/apps/beta',
      tags: ['beta'],
      version: '1.0.0',
      featured: false,
      disabled: false,
    },
    {
      id: 'gamma-app',
      title: 'Gamma App',
      description: 'Gamma description',
      icon: '🌀',
      category: 'Productivity',
      path: '/apps/gamma',
      tags: ['gamma'],
      version: '1.0.0',
      featured: false,
      disabled: false,
    },
  ];

  return {
    __esModule: true,
    APP_CATEGORIES: {
      Productivity: { icon: '💼' },
    },
    getAllApps: jest.fn(() => mockApps),
  };
});

jest.mock('../../state/globalGistSettings', () => ({
  __esModule: true,
  readGlobalGistSettings: jest.fn(() => ({ gistId: '', gistToken: '' })),
  subscribeToGlobalGistSettings: jest.fn(() => jest.fn()),
  writeGlobalGistSettings: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('AppLauncher', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders favorite apps before non-favorites', () => {
    localStorage.setItem('favoriteAppIds', JSON.stringify(['beta-app']));

    render(<AppLauncher />);

    const appsSection = screen.getByText(/All Apps/).closest('section');
    expect(appsSection).not.toBeNull();

    const titles = within(appsSection).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

    expect(titles).toEqual(['Beta App', 'Alpha App', 'Gamma App']);
  });
});
