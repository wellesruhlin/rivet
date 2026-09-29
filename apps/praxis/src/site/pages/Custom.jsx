import {useMemo} from 'react';
import {Configurator} from '@rivet/configurator';
import {engine} from '@rivet/brand-praxis';
import {guides} from '@rivet/brand-praxis/guides';
import {addCustom, customItem, updateCustom} from '../store.js';
import {toast} from '../toast.jsx';
import {parseHash} from '../router.js';

const STORAGE_KEY = 'praxis-custom-build-v1';

// #/custom?build=<encoded>  a shared build
// #/custom?model=gpo&length=182  a stock page's "Build it your way"
// #/custom?item=<key>  a custom pair already in the bag, edited in place
function linkFor() {
  const read = () => {
    const {path, query} = parseHash(location.hash);
    if (path !== '/custom') return null;
    if (query.get('build')) return query.get('build');
    if (query.get('model')) return new URLSearchParams({model: query.get('model'), ...(query.get('length') ? {length: query.get('length')} : {})}).toString();
    return null;
  };
  return {
    read,
    url: encoded => `${location.origin}${location.pathname}#/custom?build=${encodeURIComponent(encoded)}`,
    listen: callback => {
      const onHash = () => {
        const encoded = read();
        if (encoded) callback(encoded);
      };
      addEventListener('hashchange', onHash);
      return () => removeEventListener('hashchange', onHash);
    },
  };
}

export default function Custom({query}) {
  const itemKey = query.get('item');
  const editing = itemKey ? customItem(itemKey) : null;
  const link = useMemo(linkFor, []);
  const reviewStep = engine.steps.length - 1;

  const finalAction = {
    label: editing ? 'Update your bag' : 'Add to bag',
    run: (config, {notify, goTo}) => {
      const missing = engine.missingForOrder(config);
      if (missing.length) {
        notify(`Before adding this build, ${missing[0].label}.`);
        goTo(missing[0].step);
        return;
      }
      const name = engine.context(config).model.name;
      if (editing) {
        updateCustom(itemKey, config);
        toast(`Your custom ${name} is updated in the bag.`);
      } else {
        addCustom(config);
        toast(`Custom ${name} added to your bag.`);
      }
    },
  };

  return (
    <div className="px-custom">
      <h1 className="px-sr-only">Build a custom Praxis ski</h1>
      <Configurator
        key={itemKey ?? 'new'}
        engine={engine}
        guides={guides}
        link={link}
        storageKey={STORAGE_KEY}
        finalAction={finalAction}
        initial={editing ? {config: editing.config, step: reviewStep} : undefined}
      />
    </div>
  );
}
