const buildHeaders = (token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export const verifyGistConnection = async ({ gistId, gistToken }) => {
  if (!gistId) {
    throw new Error('A gist ID is required to verify the connection.');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this environment.');
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
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
