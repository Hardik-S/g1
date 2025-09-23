import { readFavorites, writeFavorites } from '../favoritesStorage';

describe('favoritesStorage', () => {
  it('returns an empty array when storage is unavailable', () => {
    expect(readFavorites(undefined)).toEqual([]);
  });

  it('returns parsed favorites from storage', () => {
    const mockStorage = {
      localStorage: {
        getItem: jest.fn(() => JSON.stringify(['alpha', 'beta'])),
      },
    };

    expect(readFavorites(mockStorage)).toEqual(['alpha', 'beta']);
    expect(mockStorage.localStorage.getItem).toHaveBeenCalledWith('favoriteAppIds');
  });

  it('returns an empty array when stored value is invalid JSON', () => {
    const mockStorage = {
      localStorage: {
        getItem: jest.fn(() => '{not valid json'),
      },
    };

    expect(readFavorites(mockStorage)).toEqual([]);
  });

  it('returns an empty array when stored value is not an array', () => {
    const mockStorage = {
      localStorage: {
        getItem: jest.fn(() => JSON.stringify({ nope: true })),
      },
    };

    expect(readFavorites(mockStorage)).toEqual([]);
  });

  it('writes favorites as JSON when storage is available', () => {
    const setItem = jest.fn();
    const mockStorage = {
      localStorage: {
        setItem,
      },
    };

    expect(writeFavorites(['foo', 'bar'], mockStorage)).toBe(true);
    expect(setItem).toHaveBeenCalledWith('favoriteAppIds', JSON.stringify(['foo', 'bar']));
  });

  it('returns false when storage write fails', () => {
    const mockStorage = {
      localStorage: {
        setItem: jest.fn(() => {
          throw new Error('nope');
        }),
      },
    };

    expect(writeFavorites(['foo'], mockStorage)).toBe(false);
  });

  it('returns false when storage is unavailable', () => {
    expect(writeFavorites(['foo'], { })).toBe(false);
  });
});
