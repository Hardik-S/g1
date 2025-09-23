export const matchesAppQuery = (app, options = {}) => {
  if (!app || app.disabled) {
    return false;
  }

  const { category = 'All', searchTerm = '' } = options;
  const normalizedCategory = typeof category === 'string' ? category : 'All';
  const normalizedSearchTerm = typeof searchTerm === 'string' ? searchTerm : '';

  if (normalizedCategory !== 'All' && app.category !== normalizedCategory) {
    return false;
  }

  const loweredSearchTerm = normalizedSearchTerm.toLowerCase();

  if (loweredSearchTerm === '') {
    return true;
  }

  const title = typeof app.title === 'string' ? app.title.toLowerCase() : '';
  const description = typeof app.description === 'string' ? app.description.toLowerCase() : '';
  const tags = Array.isArray(app.tags) ? app.tags : [];

  if (title.includes(loweredSearchTerm)) {
    return true;
  }

  if (description.includes(loweredSearchTerm)) {
    return true;
  }

  return tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().includes(loweredSearchTerm));
};

export default matchesAppQuery;
