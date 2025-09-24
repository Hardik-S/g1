let seed = 0;

export const createStableId = (prefix, hint = '') => {
  seed += 1;
  const cleanHint = hint
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `${prefix}-${cleanHint || 'item'}-${seed}`;
};

export const ensureId = (entity, prefix) => {
  if (entity.id) return entity.id;
  const id = createStableId(prefix, entity.label || entity.title || 'item');
  entity.id = id;
  return id;
};
