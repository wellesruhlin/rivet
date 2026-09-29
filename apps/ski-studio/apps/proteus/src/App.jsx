import {Configurator} from '@ski-studio/configurator';
import {engine} from './brand/index.js';
import {asset} from './brand/art.js';
import {guides} from './guides.jsx';
import {attachWidgets} from './widgets.jsx';

attachWidgets(engine);

const LINK_PREFIX = '#build=';
// Build links live in the URL hash so the concept works on any static host.
const link = {
  read: () => (location.hash.startsWith(LINK_PREFIX) ? location.hash.slice(LINK_PREFIX.length) : null),
  url: encoded => `${location.origin}${location.pathname}${LINK_PREFIX}${encoded}`,
  listen: callback => {
    const onHash = () => location.hash.startsWith(LINK_PREFIX) && callback(location.hash.slice(LINK_PREFIX.length));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  },
};

function Header({nav, actions}) {
  return (
    <>
      <header className="cfg-host-header pt-header">
        <div className="pt-brand">
          <a className="pt-logo" href="https://www.proteussnowboards.com" target="_blank" rel="noreferrer" aria-label="Proteus Snowboards website (opens in a new tab)">
            <span className="pt-mark">
              <img src={asset('assets/mark.png')} alt="" width="14" height="21" />
            </span>
            <span className="pt-wordmark" aria-hidden="true">Proteus</span>
          </a>
          <span className="pt-brand-rule" aria-hidden="true" />
          <span className="pt-brand-label">Custom Shop</span>
          <span className="pt-concept-tag">Fan concept</span>
        </div>
        {actions}
      </header>
      {nav}
    </>
  );
}

export default function App() {
  return <Configurator engine={engine} guides={guides} link={link} storageKey="proteus-fan-build-v1" header={(nav, actions) => <Header nav={nav} actions={actions} />} />;
}
