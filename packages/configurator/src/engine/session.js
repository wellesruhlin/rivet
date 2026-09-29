// The customer session in one value: the validated configuration, reviewed steps,
// confirmed choices, the latest dependency explanations, the current step and the stage
// view. Transitions are pure so they can be tested in Node.
//
// A pack may ask for explicit confirmation of some defaults before the customer moves
// past a step: pack.confirm = {step, fields}. Each field is confirmed by choosing it, or by
// accepting it with the step's primary button; changing its value takes the confirmation
// away. Later steps send the customer back to the first unconfirmed field.

const confirmation = engine => {
  const spec = engine.pack.confirm;
  if (!spec) return null;
  return {fields: spec.fields, step: engine.steps.findIndex(step => step.id === spec.step)};
};

/** The first field the customer still has to confirm, or undefined. */
export function nextConfirmation(engine, state) {
  return confirmation(engine)?.fields.find(field => !state.confirmed?.includes(field));
}

export function initialSession(engine, {config, changes = [], reviewed = [], confirmed = []} = {}) {
  const spec = confirmation(engine);
  return {
    config: config ?? engine.defaults(),
    reviewed,
    confirmed: spec ? spec.fields.filter(field => confirmed.includes(field)) : [],
    adjustments: changes,
    step: 0,
    field: '',
    view: engine.pack.art?.faces?.[0] ?? 'Topsheet',
  };
}

export function createSessionReducer(engine) {
  const lastStep = engine.steps.length - 1;
  const spec = confirmation(engine);
  const viewFor = (field, step) => engine.pack.viewForField?.(field, step) ?? engine.pack.art?.faces?.[0] ?? 'Topsheet';
  // Instructions that ask the customer to choose again retire once answered; a binding
  // notice retires with the next patch that sets the binding.
  const answered = (change, patch, config) => {
    const type = engine.group(change.field)?.type;
    if (type === 'binding') return Object.hasOwn(patch, change.field);
    return ['model', 'length'].includes(type) && Object.hasOwn(patch, change.field) && config[change.field];
  };
  const at = (state, step, field) => ({...state, step, field, view: viewFor(field, step)});

  return function sessionReducer(state, action) {
    switch (action.type) {
      case 'patch': {
        const {config, changes: applied} = engine.apply(state.config, action.patch);
        // `notes` are explanations the caller worked out itself (a binding carried through a
        // shape edit is part of the patch, so the engine doesn't explain it).
        const changes = [...applied, ...(action.notes ?? [])];
        const confirmed = spec
          ? spec.fields.filter(field =>
            (Object.hasOwn(action.patch, field) && action.patch[field] === config[field]) ||
            (state.confirmed.includes(field) && state.config[field] === config[field]))
          : state.confirmed;
        return {
          ...state,
          config,
          confirmed,
          reviewed: engine.invalidateReviews(state.config, config, state.reviewed),
          adjustments: changes.length ? changes : state.adjustments.filter(change => !answered(change, action.patch, config)),
        };
      }
      // A shared link or a restored save; the caller has already normalized it.
      case 'load':
        return {...initialSession(engine, action), view: state.view};
      case 'goto': {
        if (action.step > 0 && !engine.ready(state.config)) return state;
        const missing = nextConfirmation(engine, state);
        if (spec && missing && action.step > spec.step) return at(state, spec.step, missing);
        return at(state, action.step, action.field || '');
      }
      case 'advance': {
        if (!engine.ready(state.config) || state.step >= lastStep) return state;
        if (spec && state.step === spec.step) {
          const missing = nextConfirmation(engine, state);
          if (missing && state.field !== missing) return at(state, state.step, missing);
          // Accepting a default confirms it without choosing something different.
          const confirmed = missing ? [...state.confirmed, missing] : state.confirmed;
          const next = nextConfirmation(engine, {confirmed});
          if (next) return {...at(state, state.step, next), confirmed};
          return {...at(state, state.step + 1, ''), confirmed, reviewed: [...new Set([...state.reviewed, state.step])]};
        }
        return {...at(state, state.step + 1, ''), reviewed: [...new Set([...state.reviewed, state.step])]};
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
