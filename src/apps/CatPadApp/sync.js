export const DEFAULT_SYNC_FILENAME = 'catpad-notes.json';

const parseIsoDate = (value) => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
};

export const mergeNoteCollections = (localNotes, remoteNotes, remoteExportedAt, lastRemoteExportedAt) => {
  const safeLocal = Array.isArray(localNotes) ? localNotes : [];
  const safeRemote = Array.isArray(remoteNotes) ? remoteNotes : [];
  const remoteIds = new Set(safeRemote.map((note) => note.id));
  const remoteExportedTime = parseIsoDate(remoteExportedAt)?.getTime() ?? null;
  const lastRemoteTime = parseIsoDate(lastRemoteExportedAt)?.getTime() ?? null;
  const mergedMap = new Map();

  const selectLatest = (existing, incoming) => {
    if (!existing) return incoming;
    const existingTime = parseIsoDate(existing.updatedAt)?.getTime() ?? parseIsoDate(existing.createdAt)?.getTime() ?? 0;
    const incomingTime = parseIsoDate(incoming.updatedAt)?.getTime() ?? parseIsoDate(incoming.createdAt)?.getTime() ?? 0;

    return incomingTime >= existingTime ? incoming : existing;
  };

  safeRemote.forEach((note) => {
    if (!note || !note.id) return;
    mergedMap.set(note.id, note);
  });

  safeLocal.forEach((note) => {
    if (!note || !note.id) return;
    if (remoteIds.has(note.id)) {
      const existing = mergedMap.get(note.id);
      mergedMap.set(note.id, selectLatest(existing, note));
    } else {
      if (remoteExportedTime === null) {
        mergedMap.set(note.id, note);
      } else {
        const noteTime = parseIsoDate(note.updatedAt)?.getTime() ?? parseIsoDate(note.createdAt)?.getTime() ?? 0;
        if (noteTime > remoteExportedTime) {
          mergedMap.set(note.id, note);
        } else if (lastRemoteTime !== null && noteTime > lastRemoteTime) {
          mergedMap.set(note.id, note);
        }
      }
    }
  });

  const merged = Array.from(mergedMap.values()).map((note) => ({
    ...note,
    createdAt: note.createdAt ?? new Date().toISOString(),
    updatedAt: note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
  }));

  merged.sort((a, b) => {
    const aTime = parseIsoDate(a.updatedAt)?.getTime() ?? 0;
    const bTime = parseIsoDate(b.updatedAt)?.getTime() ?? 0;
    return bTime - aTime;
  });

  return merged;
};

const buildHeaders = (token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const normalizeFilename = (filename) => {
  if (!filename) return DEFAULT_SYNC_FILENAME;
  return filename.trim() || DEFAULT_SYNC_FILENAME;
};

export const pullFromGist = async ({ gistId, token, filename }) => {
  if (!gistId) {
    throw new Error('Gist ID is required for sync.');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this environment.');
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to read gist (${response.status}): ${errorText || 'Unknown error'}`);
  }

  const data = await response.json();
  const effectiveFilename = normalizeFilename(filename);
  const file = data.files?.[effectiveFilename];

  if (!file || typeof file.content !== 'string') {
    return {
      notes: [],
      exportedAt: null,
      gistUpdatedAt: data.updated_at,
    };
  }

  try {
    const parsed = JSON.parse(file.content);
    const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    return {
      notes,
      exportedAt: parsed.exportedAt ?? parsed.syncedAt ?? null,
      gistUpdatedAt: data.updated_at,
    };
  } catch (error) {
    throw new Error('Failed to parse CatPad data in gist.');
  }
};

export const pushToGist = async ({ gistId, token, filename, notes }) => {
  if (!gistId) {
    throw new Error('Gist ID is required for sync.');
  }

  if (!token) {
    throw new Error('A GitHub token with gist scope is required to push notes.');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this environment.');
  }

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    notes: Array.isArray(notes) ? notes : [],
  };

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      ...buildHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [normalizeFilename(filename)]: {
          content: JSON.stringify(payload, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to update gist (${response.status}): ${errorText || 'Unknown error'}`);
  }

  const data = await response.json();
  return {
    exportedAt: payload.exportedAt,
    gistUpdatedAt: data.updated_at,
  };
};
