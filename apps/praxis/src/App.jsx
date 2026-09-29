import {useEffect, useRef, useState} from 'react';
import {product} from './catalog/index.js';
import {useRoute} from './site/router.js';
import {CompareBar, Footer, Header, MenuDialog, SearchDialog} from './site/Layout.jsx';
import {Toast} from './site/toast.jsx';
import Home from './site/pages/Home.jsx';
import Collection from './site/pages/Collection.jsx';
import Product from './site/pages/Product.jsx';
import Compare from './site/pages/Compare.jsx';
import Bag from './site/pages/Bag.jsx';
import Custom from './site/pages/Custom.jsx';
import {Materials, NotFound, Support, Workshop} from './site/pages/Editorial.jsx';

function resolve({path, query}) {
  if (path === '/') return {title: 'Wood. Snow. Soul.', page: <Home />};
  if (path === '/skis') return {title: 'Stock skis', page: <Collection query={query} />};
  const stock = path.startsWith('/skis/') && product(path.slice(6));
  if (stock) return {title: stock.name, page: <Product key={stock.id} p={stock} />};
  if (path === '/custom') return {title: 'Build a custom pair', page: <Custom query={query} />, app: true};
  if (path === '/compare') return {title: 'Compare skis', page: <Compare />};
  if (path === '/bag') return {title: 'Your bag', page: <Bag />};
  if (path === '/workshop') return {title: 'Our workshop', page: <Workshop />};
  if (path === '/materials') return {title: 'Wood & finish', page: <Materials />};
  if (path === '/support') return {title: 'Help & sizing', page: <Support />};
  return {title: 'Page not found', page: <NotFound />};
}

export default function App() {
  const route = useRoute();
  const {title, page, app} = resolve(route);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const main = useRef(null);
  const lastPath = useRef(route.path);

  // A new page starts at the top, with focus on the content for keyboard and screen reader users.
  useEffect(() => {
    document.title = `Praxis — ${title}`;
    if (lastPath.current === route.path) return;
    lastPath.current = route.path;
    window.scrollTo({top: 0, behavior: 'instant'});
    main.current?.focus({preventScroll: true});
    setSearchOpen(false);
    setMenuOpen(false);
  }, [route.path, title]);

  return (
    <div className={`px-app ${app ? 'is-app' : ''}`}>
      <a
        className="px-skip-link"
        href="#main"
        onClick={event => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <Header path={route.path} onSearch={() => setSearchOpen(true)} onMenu={() => setMenuOpen(true)} />
      <main id="main" ref={main} tabIndex={-1} className="px-main">
        {page}
      </main>
      {!app && <Footer />}
      <CompareBar path={route.path} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MenuDialog open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Toast />
    </div>
  );
}
