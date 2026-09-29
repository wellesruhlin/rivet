import {applyConfigChange, defaultConfig, invalidateReviews, shapeReady, steps} from './flagship-config.js';
import {viewForField} from './flagship-preview-views.js';
import {bindingFor} from './flagship-bindings.js';

// A visual/owned selection survives a stock update without entering the quote.
// The existing loader normalizes commercial orderability and recovers this exact
// ID as a preview when unavailable. Never turn an unknown ID into another model.
export function retainedBuildConfig(config, previewBinding = null) {
  const binding = previewBinding || config.binding;
  if (binding && !bindingFor(binding)) throw new Error('Selected binding is not in this catalog.');
  return {...config, binding: binding ? String(binding) : ''};
}

// The whole customer session in one value: the validated configuration, which
// sections have been reviewed, the latest dependency explanations and where the
// customer is in the flow. Every transition is pure so it can be tested in Node.
export const GRAPHIC_CHOICES = ['base', 'sidewall'];
export const nextGraphicField = state => GRAPHIC_CHOICES.find(field => !state.graphicsConfirmed.includes(field));
export const initialBuild = ({config = defaultConfig, changes = [], reviewed = [], graphicsConfirmed = []} = {}) => ({
  config,
  reviewed,
  graphicsConfirmed: GRAPHIC_CHOICES.filter(field => graphicsConfirmed.includes(field)),
  adjustments: changes,
  step: 0,
  field: '',
  view: 'Topsheet',
});

// Adjustments for these fields ask the customer to choose again; they retire once answered.
// A binding notice retires with the next patch that sets the binding.
const INSTRUCTIONS = ['model', 'length'];

export function buildReducer(state, action) {
  switch (action.type) {
    case 'patch': {
      const {config, changes} = applyConfigChange(state.config, action.patch);
      const answered = change => Object.hasOwn(action.patch, change.field) && (change.field === 'binding' || INSTRUCTIONS.includes(change.field) && config[change.field]);
      return {
        ...state,
        config,
        graphicsConfirmed: GRAPHIC_CHOICES.filter(field =>
          Object.hasOwn(action.patch, field) && action.patch[field] === config[field] ||
          state.graphicsConfirmed.includes(field) && state.config[field] === config[field]),
        reviewed: invalidateReviews(state.config, config, state.reviewed),
        adjustments: changes.length ? changes : state.adjustments.filter(change => !answered(change)),
      };
    }
    // A shared link or a restored save. The caller has already normalized it.
    case 'load':
      return initialBuild(action);
    case 'goto': {
      if (action.step > 0 && !shapeReady(state.config)) return state;
      const missing = nextGraphicField(state);
      if (action.step > 1 && missing) return {...state, step: 1, field: missing, view: viewForField(missing, 1)};
      const field = action.field || '';
      return {...state, step: action.step, field, view: viewForField(field, action.step)};
    }
    case 'advance': {
      if (!shapeReady(state.config) || state.step >= steps.length - 1) return state;
      if (state.step === 1) {
        const missing = nextGraphicField(state);
        if (missing && state.field !== missing) return {...state, field: missing, view: viewForField(missing, 1)};
        // A default can be accepted without choosing a different color/artwork.
        const confirmed = missing ? [...state.graphicsConfirmed, missing] : state.graphicsConfirmed;
        const next = nextGraphicField({...state, graphicsConfirmed: confirmed});
        if (next) return {...state, graphicsConfirmed: confirmed, field: next, view: viewForField(next, 1)};
        return {...state, graphicsConfirmed: confirmed, reviewed: [...new Set([...state.reviewed, 1])], step: 2, field: '', view: 'Construction'};
      }
      return {...state, reviewed: [...new Set([...state.reviewed, state.step])], step: state.step + 1, field: '', view: viewForField('', state.step + 1)};
    }
    case 'view':
      return {...state, view: action.view};
    case 'dismissAdjustments':
      return {...state, adjustments: []};
    default:
      throw new Error(`Unknown build action: ${action.type}`);
  }
}
