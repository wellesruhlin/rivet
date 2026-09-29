// The flagship's session names over the shared engine, so its original tests run
// unchanged against the rebuild. `graphicsConfirmed` is the engine's `confirmed`.
import {createSessionReducer, initialSession, nextConfirmation} from '@rivet/configurator/engine';
import {engine} from '../src/index.js';
import {bindingFor} from '../src/bindings.js';

const reduce = createSessionReducer(engine);
const expose = state => ({...state, graphicsConfirmed: state.confirmed});
const inward = state => ({...state, confirmed: state.confirmed ?? state.graphicsConfirmed ?? []});

export const initialBuild = ({graphicsConfirmed = [], ...rest} = {}) => expose(initialSession(engine, {...rest, confirmed: graphicsConfirmed}));
export function buildReducer(state, action) {
  const inner = inward(state);
  const next = reduce(inner, action.type === 'load' ? {...action, confirmed: action.graphicsConfirmed ?? action.confirmed ?? []} : action);
  // A transition that changes nothing returns the same state, as the flagship's did.
  return next === inner ? state : expose(next);
}
export const nextGraphicField = state => nextConfirmation(engine, inward(state));

// What the configurator stores in saves and links: a visual-test binding travels as the
// build's binding and is re-checked on load. Never turn an unknown ID into another model.
export function retainedBuildConfig(config, previewBinding = null) {
  const binding = previewBinding || config.binding;
  if (binding && !bindingFor(binding)) throw new Error('Selected binding is not in this catalog.');
  return {...config, binding: binding ? String(binding) : ''};
}
