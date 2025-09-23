const buildHeaders = (token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const verifyGistConnection = async (
  { gistId, gistToken },
  fetchFn = globalThis.fetch,
) => {
  if (!gistId) {
    throw new Error('A gist ID is required to verify the connection.');
  }

  if (typeof fetchFn !== 'function') {
    throw new Error('Fetch API is not available in this environment.');
  }

  const response = await fetchFn(`https://api.github.com/gists/${gistId}`, {
    method: 'GET',
    headers: buildHeaders(gistToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to verify gist (${response.status}): ${errorText || 'Unknown error'}`);
  }

  return response.json();
};

export default verifyGistConnection;
