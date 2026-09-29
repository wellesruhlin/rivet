// The customer session in one value: the validated configuration, reviewed
// steps, the latest dependency explanations, the current step and the stage
// view. Transitions are pure so they can be tested in Node.

export function initialSession(engine, {config, changes = [], reviewed = []} = {}) {
  return {config: config ?? engine.defaults(), reviewed, adjustments: changes, step: 0, field: '', view: engine.pack.art?.faces?.[0] ?? 'Topsheet'};
}

export function createSessionReducer(engine) {
  const lastStep = engine.steps.length - 1;
  const viewFor = (field, step) => engine.pack.viewForField?.(field, step) ?? engine.pack.art?.faces?.[0] ?? 'Topsheet';
  // Instructions that ask the customer to choose again retire once answered; a binding
  // notice retires with the next patch that sets the binding.
  const answered = (change, patch, config) => {
    const type = engine.group(change.field)?.type;
    if (type === 'binding') return Object.hasOwn(patch, change.field);
    return ['model', 'length'].includes(type) && Object.hasOwn(patch, change.field) && config[change.field];
  };

  return function sessionReducer(state, action) {
    switch (action.type) {
      case 'patch': {
        const {config, changes: applied} = engine.apply(state.config, action.patch);
        // `notes` are explanations the caller worked out itself (a binding carried through a
        // shape edit is part of the patch, so the engine doesn't explain it).
        const changes = [...applied, ...(action.notes ?? [])];
        return {
          ...state,
          config,
          reviewed: engine.invalidateReviews(state.config, config, state.reviewed),
          adjustments: changes.length ? changes : state.adjustments.filter(change => !answered(change, action.patch, config)),
        };
      }
      // A shared link or a restored save; the caller has already normalized it.
      case 'load':
        return {...initialSession(engine, action), view: state.view};
      case 'goto': {
        if (action.step > 0 && !engine.ready(state.config)) return state;
        const field = action.field || '';
        return {...state, step: action.step, field, view: viewFor(field, action.step)};
      }
      case 'advance': {
        if (!engine.ready(state.config) || state.step >= lastStep) return state;
        return {...state, reviewed: [...new Set([...state.reviewed, state.step])], step: state.step + 1, field: '', view: viewFor('', state.step + 1)};
      }
      case 'view':
        return {...state, view: action.view};
      case 'dismissAdjustments':
        return {...state, adjustments: []};
      default:
        throw new Error(`Unknown session action: ${action.type}`);
    }
  };
}
