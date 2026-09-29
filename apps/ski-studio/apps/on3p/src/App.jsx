import {Configurator} from '@ski-studio/configurator';
import {engine} from './brand/index.js';
import {assetUrl} from './brand/art.js';
import {guides} from './guides.jsx';

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
      <header className="cfg-host-header on3p-header">
        <div className="on3p-brand">
          <a href="https://www.on3pskis.com" target="_blank" rel="noreferrer" aria-label="ON3P official website (opens in a new tab)">
            <img src={assetUrl('assets/logo.png')} alt="ON3P" width="88" height="22" />
          </a>
          <span className="on3p-brand-rule" aria-hidden="true" />
          <span className="on3p-brand-label">Custom Shop</span>
          <span className="on3p-concept-tag">Fan concept</span>
        </div>
        {actions}
      </header>
      {nav}
    </>
  );
}

export default function App() {
  return <Configurator engine={engine} guides={guides} link={link} storageKey="on3p-fan-build-v1" header={(nav, actions) => <Header nav={nav} actions={actions} />} />;
}
