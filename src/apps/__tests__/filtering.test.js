import matchesAppQuery from '../filtering';

describe('matchesAppQuery', () => {
  const baseApp = {
    id: 'test-app',
    title: 'Quantum Painter',
    description: 'Create masterpieces with physics',
    category: 'Creativity',
    tags: ['Quantum', 'Art'],
    disabled: false,
  };

  it('returns false for disabled apps even when the search matches', () => {
    const result = matchesAppQuery(
      { ...baseApp, disabled: true },
      { category: 'Creativity', searchTerm: 'quantum' },
    );

    expect(result).toBe(false);
  });

  it('matches tags in a case-insensitive manner', () => {
    const tagOnlyApp = {
      ...baseApp,
      title: 'Gallery',
      description: 'Colorful creations',
      tags: ['Strategy', 'Brain Teaser'],
    };

    const result = matchesAppQuery(tagOnlyApp, {
      category: 'Creativity',
      searchTerm: 'brain',
    });

    expect(result).toBe(true);

    const mixedCaseResult = matchesAppQuery(tagOnlyApp, {
      category: 'Creativity',
      searchTerm: 'BRAin',
    });

    expect(mixedCaseResult).toBe(true);
  });

  it('treats the "All" category as a wildcard', () => {
    const result = matchesAppQuery(baseApp, {
      category: 'All',
      searchTerm: '',
    });

    expect(result).toBe(true);
  });

  it('requires the category to match when not filtering by "All"', () => {
    const result = matchesAppQuery(baseApp, {
      category: 'Productivity',
      searchTerm: '',
    });

    expect(result).toBe(false);
  });
});
