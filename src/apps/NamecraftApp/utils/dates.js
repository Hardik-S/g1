export const nowIso = () => new Date().toISOString();

export const formatRelative = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
