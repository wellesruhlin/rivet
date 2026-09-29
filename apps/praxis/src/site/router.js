// Hash routes keep the concept deployable to any static host:
// #/  #/skis  #/skis/:id  #/custom  #/compare  #/bag  #/workshop  #/materials  #/support
import {useSyncExternalStore} from 'react';

const subscribe = callback => {
  addEventListener('hashchange', callback);
  return () => removeEventListener('hashchange', callback);
};

export function parseHash(hash) {
  const [path, query = ''] = (hash.slice(1) || '/').split('?');
  return {path: path || '/', query: new URLSearchParams(query)};
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return {...parseHash(hash), hash};
}

export function href(path, query) {
  const params = new URLSearchParams(query ?? {});
  return `#${path}${params.size ? `?${params}` : ''}`;
}

// Updates the query string without adding history entries or re-running the route.
export const replaceQuery = (path, query) => history.replaceState(null, '', href(path, query));
