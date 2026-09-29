// Gallery filtering for tests and scripts; the UI uses the shared gallery with the same rules.
import {graphicCategory} from './rules.js';

export const filterGraphics = (list, search = '', filter = 'All') => {
  const query = search.trim().toLowerCase();
  return list.filter(g => g.name.toLowerCase().includes(query) && (filter === 'All' || graphicCategory(g) === filter));
};
export const visibleGraphics = (list, search = '', filter = 'All', limit = 12) => filterGraphics(list, search, filter).slice(0, limit);
