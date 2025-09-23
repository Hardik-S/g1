export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cat-${Math.random().toString(16).slice(2)}-${Date.now()}`;
};

export const normalizeNote = (note) => {
  if (!note) return null;
  const now = new Date().toISOString();
  return {
    id: note.id || generateId(),
    title: note.title || 'Untitled Cat',
    content: note.content || '',
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || note.createdAt || now,
  };
};

export const createWelcomeNote = () => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'Welcome to CatPad',
    content: `Welcome to CatPad! 🐾\n\n• Use the sidebar to create, open, and delete notes.\n• CatPad autosaves locally and can sync through a GitHub Gist.\n• Head to the Cloud Sync panel to plug in your gist ID and token so every browser stays in purr-fect sync.\n\nHappy typing!`,
    createdAt: now,
    updatedAt: now,
  };
};

export const sortNotes = (notes) => {
  const safe = Array.isArray(notes) ? [...notes] : [];
  safe.sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
  return safe;
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'never';
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) {
    return 'unknown';
  }
  const diffSeconds = Math.round((Date.now() - time) / 1000);
  if (diffSeconds < 45) {
    return 'just now';
  }
  if (diffSeconds < 90) {
    return 'a meowment ago';
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(time);
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Never synced';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Never synced';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

export const hasNotesChanged = (previous, next) => {
  const prevList = Array.isArray(previous) ? previous : [];
  const nextList = Array.isArray(next) ? next : [];
  if (prevList.length !== nextList.length) {
    return true;
  }
  const sortById = (list) => [...list].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const aSorted = sortById(prevList);
  const bSorted = sortById(nextList);
  for (let index = 0; index < aSorted.length; index += 1) {
    const aNote = aSorted[index];
    const bNote = bSorted[index];
    if ((aNote.id || '') !== (bNote.id || '')) return true;
    if ((aNote.title || '') !== (bNote.title || '')) return true;
    if ((aNote.content || '') !== (bNote.content || '')) return true;
    if ((aNote.updatedAt || '') !== (bNote.updatedAt || '')) return true;
  }
  return false;
};
