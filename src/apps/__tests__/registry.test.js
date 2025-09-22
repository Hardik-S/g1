import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { APP_REGISTRY, getAllApps, getAppById, getAppLoader } from '../registry';

describe('app registry', () => {
  it('registers the CatPad app metadata', () => {
    const catpad = getAppById('catpad');

    expect(catpad).toBeTruthy();
    expect(catpad.title).toBe('CatPad');
    expect(catpad.category).toBe('Productivity');
    expect(catpad.icon).toBe('😺');
    expect(catpad.path).toBe('/apps/catpad');
  });

  it('registers the Cat Typing Speed Test metadata', () => {
    const typingTest = getAppById('cat-typing-speed-test');

    expect(typingTest).toBeTruthy();
    expect(typingTest.title).toBe('Cat Typing Speed Test');
    expect(typingTest.category).toBe('Education');
    expect(typingTest.icon).toBe('⌨️');
    expect(typingTest.path).toBe('/apps/cat-typing-speed-test');
  });

  it('assigns default versions that match the x.yz.dd format', () => {
    const versionPattern = /^[1-5]\.(?:0[2-8]|1[2-8])\.00$/;

    getAllApps().forEach((app) => {
      expect(app.version).toMatch(versionPattern);
    });
  });

});

describe('getAppLoader', () => {
  it('memoizes lazy loader instances for known apps', () => {
    const firstLoader = getAppLoader('zen-go');
    const secondLoader = getAppLoader('zen-go');

    expect(firstLoader).toBeDefined();
    expect(secondLoader).toBe(firstLoader);
  });

  it('returns null when no loader metadata exists', () => {
    expect(getAppLoader('app-3')).toBeNull();
    expect(getAppLoader('definitely-not-an-app')).toBeNull();
  });

  it('supports dynamically registered apps end-to-end', async () => {
    const testId = '__test-app__';
    const TestApp = () => <div data-testid="test-app">Hello from test</div>;
    const loader = jest.fn(() => Promise.resolve({ default: TestApp }));

    APP_REGISTRY[testId] = {
      id: testId,
      title: 'Test App',
      description: 'Temporary test app',
      icon: '🧪',
      category: 'Development',
      component: null,
      loader,
      path: '/apps/test-app',
      tags: ['test'],
      version: '0.0.1',
      author: 'Test Suite',
      created: '2024-01-01',
      featured: false,
    };

    try {
      const LazyTestApp = getAppLoader(testId);
      expect(LazyTestApp).toBeDefined();
      expect(getAppLoader(testId)).toBe(LazyTestApp);

      render(
        <Suspense fallback={<div>loading</div>}>
          <LazyTestApp />
        </Suspense>
      );

      expect(await screen.findByTestId('test-app')).toHaveTextContent('Hello from test');
      expect(loader).toHaveBeenCalledTimes(1);
    } finally {
      delete APP_REGISTRY[testId];
    }
  });
});
