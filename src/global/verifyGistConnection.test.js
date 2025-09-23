import { verifyGistConnection } from './verifyGistConnection';

describe('verifyGistConnection', () => {
  const gistId = '123abc';

  it('returns gist data when the request succeeds', async () => {
    const gistToken = 'token-123';
    const gistData = { id: gistId };
    const json = jest.fn().mockResolvedValue(gistData);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json,
    });

    const result = await verifyGistConnection({ gistId, gistToken }, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${gistToken}`,
      },
    });
    expect(json).toHaveBeenCalledTimes(1);
    expect(result).toEqual(gistData);
  });

  it('throws an error when the request fails', async () => {
    const text = jest.fn().mockResolvedValue('Not Found');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text,
    });

    await expect(
      verifyGistConnection({ gistId, gistToken: undefined }, fetchMock),
    ).rejects.toThrow('Unable to verify gist (404): Not Found');

    expect(fetchMock).toHaveBeenCalledWith(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('throws when no fetch implementation is available', async () => {
    await expect(
      verifyGistConnection({ gistId, gistToken: undefined }, null),
    ).rejects.toThrow('Fetch API is not available in this environment.');
  });
});
