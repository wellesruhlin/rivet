// Brand-agnostic configuration engine.
//
// A brand pack declares ordered option groups. Every entry point — customer
// edits, restored saves and shared links — runs through the same `normalize`,
// in that order, so dependent choices are always validated against the
// choices before them and explained when they have to change.
//
// Group types: category, model, length, choice, toggle, gallery, text, binding, number.
// Groups may define:
//   options(config, ctx)        choices for category/model/length/choice/gallery
//   reason(value, config, ctx)  why a value is unavailable ('' when available)
//   fixed(config, ctx)          a value the customer cannot change (e.g. an included part)
//   default(config, ctx, input) fallback when nothing valid was requested
//   price(value, config, ctx)   number, or {quote: [min, max]} for quote-only items
//   format(value, config, ctx)  display text
//   resets                      group ids cleared when this group changes
//   explain                     false to never explain a change to this group (see changeNotes)
//   bom                         false to leave the group out of the build sheet, or
//                               (config, ctx) => boolean to list it only when it applies
//   min, max                    the accepted range of a `number` group
//   sanitize(text)              cleans a `text` group's value (after it is cut to maxLength)

const EMPTY = [undefined, null, ''];
export const isEmpty = value => EMPTY.includes(value);

// Whole amounts print without cents ($1,600); amounts with cents keep them ($499.95).
const currencyFormatters = new Map();
export function formatMoney(amount, currency = 'USD') {
  const cents = Math.round(amount * 100) % 100 !== 0;
  const key = `${currency}-${cents}`;
  if (!currencyFormatters.has(key)) currencyFormatters.set(key, new Intl.NumberFormat('en-US', {style: 'currency', currency, minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0}));
  return currencyFormatters.get(key).format(amount);
}

const valueOf = option => (typeof option === 'object' && option !== null ? option.value ?? option.id : option);

export function createEngine(pack) {
  const groups = pack.groups;
  const groupsById = new Map(groups.map(group => [group.id, group]));
  const stepIds = pack.steps.map(step => step.id);
  const stepOfGroup = new Map(groups.map(group => [group.id, stepIds.indexOf(group.step)]));
  const context = config => pack.context(config);

  const options = (group, config, ctx = context(config)) => (group.options ? group.options(config, ctx) : []);
  const findOption = (group, value, config, ctx) => options(group, config, ctx).find(option => valueOf(option) === value);
  const reason = (group, value, config, ctx = context(config)) => (group.reason ? group.reason(value, config, ctx) || '' : '');

  function coerce(group, value) {
    if (group.type === 'toggle') return value === true || value === 'true';
    if (group.type === 'number') return isEmpty(value) || !Number.isFinite(Number(value)) ? null : Number(value);
    if (group.type === 'length') return isEmpty(value) ? null : Number(value);
    if (group.type === 'text') {
      const text = typeof value === 'string' ? value.slice(0, group.maxLength ?? 500) : '';
      return group.sanitize ? group.sanitize(text) : text;
    }
    return isEmpty(value) ? '' : String(value);
  }

  function accepts(group, value, config, ctx) {
    if (group.type === 'text') return typeof value === 'string';
    if (group.type === 'toggle') return value === false || (value === true && !reason(group, true, config, ctx));
    if (group.type === 'number') return Number.isFinite(value) && value >= (group.min ?? -Infinity) && value <= (group.max ?? Infinity) && !reason(group, value, config, ctx);
    if (isEmpty(value)) return false;
    const option = findOption(group, value, config, ctx);
    return !!option && !option.disabled && !reason(group, value, config, ctx);
  }

  function fallback(group, config, ctx, input) {
    if (group.default) return coerce(group, group.default(config, ctx, input));
    if (group.type === 'toggle') return false;
    if (group.type === 'text') return '';
    if (group.type === 'length' || group.type === 'number') return null;
    return '';
  }

  // Validates every group in dependency order.
  function normalize(input = {}) {
    const config = {};
    for (const group of groups) {
      const ctx = context(config);
      const fixed = group.fixed?.(config, ctx);
      if (fixed !== undefined) {
        config[group.id] = coerce(group, fixed);
        continue;
      }
      const requested = coerce(group, input[group.id]);
      config[group.id] = accepts(group, requested, config, ctx) ? requested : fallback(group, config, ctx, input);
    }
    return config;
  }

  const defaults = () => normalize({});

  function format(groupOrId, value, config) {
    const group = typeof groupOrId === 'string' ? groupsById.get(groupOrId) : groupOrId;
    const ctx = context(config);
    if (group.format) return group.format(value, config, ctx);
    if (group.type === 'toggle') return value ? 'Yes' : 'No';
    if (group.type === 'text') return value;
    if (group.type === 'number') return isEmpty(value) ? '' : String(value);
    const option = findOption(group, value, config, ctx);
    return option?.label ?? option?.name ?? (isEmpty(value) ? '' : String(value));
  }

  function explain(group, previous, config) {
    const ctx = context(config);
    const custom = pack.explain?.(group, previous, config, ctx);
    if (custom) return custom;
    if (group.type === 'length' && config[group.id] === null) return `${previous[group.id]} cm cleared. Choose an available length for your new shape.`;
    if (group.type === 'model' && !config[group.id]) return 'Choose a model in your new category.';
    const why = reason(group, previous[group.id], config, ctx);
    return `${group.label}: ${format(group, previous[group.id], previous)} → ${format(group, config[group.id], config)}.${why ? ` ${why}` : ''}`;
  }

  // The configuration an edit asks for, before validation: the patch over the previous
  // build, dependent choices it resets, and the pack's own adjustments. The order side
  // (product contracts) shares this step with customer edits.
  function prepare(previous, patch = {}) {
    let requested = {...previous, ...patch};
    for (const [id, value] of Object.entries(patch)) {
      const group = groupsById.get(id);
      // A dependent choice the same edit makes explicitly is kept.
      if (group?.resets && value !== previous[id]) for (const reset of group.resets) if (!Object.hasOwn(patch, reset)) requested[reset] = undefined;
    }
    return pack.beforeNormalize?.(previous, patch, requested) ?? requested;
  }

  // Applies a customer edit and explains every dependent choice that changed.
  function apply(previous, patch = {}) {
    const config = normalize(prepare(previous, patch));
    const changes = [];
    for (const group of groups) {
      if (group.explain === false || Object.hasOwn(patch, group.id)) continue;
      if (previous[group.id] === config[group.id] || isEmpty(previous[group.id])) continue;
      if (group.type === 'text') continue;
      changes.push({field: group.id, text: explain(group, previous, config)});
    }
    // Notes a pack derives from the whole edit (a binding that joined or left the price
    // because the ski changed) lead the list.
    const notes = pack.changeNotes?.(previous, patch, config, context(config));
    if (notes?.length) changes.unshift(...notes);
    return {config, changes};
  }

  const ready = config => (pack.ready ? pack.ready(config, context(config)) : groups.filter(g => g.required).every(g => !isEmpty(config[g.id])));
  const missingForOrder = config => (pack.orderRequirements ? pack.orderRequirements(config, context(config)) : []);

  function priceOf(group, value, config, ctx) {
    if (!group.price) return 0;
    return group.price(value, config, ctx) ?? 0;
  }

  // The build sheet is the single source for the total, review breakdown and export.
  function bom(config) {
    const ctx = context(config);
    const isReady = ready(config);
    const listed = group => (typeof group.bom === 'function' ? !!group.bom(config, ctx) : group.bom !== false);
    return groups
      .filter(group => listed(group) && group.type !== 'text')
      .map(group => {
        const value = config[group.id];
        const price = priceOf(group, value, config, ctx);
        const custom = group.line?.(value, config, ctx, isReady) ?? {};
        return {
          key: group.id,
          label: group.bomLabel ?? group.label,
          value: format(group, value, config) || group.placeholder || '—',
          price: typeof price === 'number' ? price : 0,
          quote: typeof price === 'object' ? price.quote : null,
          step: stepOfGroup.get(group.id),
          pending: isEmpty(value),
          ...custom,
        };
      });
  }

  function total(config) {
    const lines = bom(config);
    // Summed in cents so prices like $499.95 never drift.
    const amount = lines.reduce((sum, line) => sum + Math.round(line.price * 100), 0) / 100;
    const quotes = lines.filter(line => line.quote);
    const quote = quotes.length ? quotes.reduce(([min, max], line) => [min + line.quote[0], max + line.quote[1]], [0, 0]) : null;
    return {amount, quote, currency: pack.currency ?? 'USD'};
  }

  const weight = config => (pack.weight ? pack.weight(config, context(config)) : null);

  function invalidateReviews(before, after, reviewed) {
    return reviewed.filter(step => !groups.some(group => stepOfGroup.get(group.id) === step && before[group.id] !== after[group.id]));
  }

  const encode = config => new URLSearchParams(groups.filter(g => !isEmpty(config[g.id]) && g.share !== false).map(g => [g.id, String(config[g.id])])).toString();
  // A link carries only the choices it names; every other group takes the pack's default
  // for that build (a model's stock artwork, say), not the pack's global default.
  function decode(text) {
    const data = Object.fromEntries(new URLSearchParams(text));
    const input = {};
    for (const group of groups) if (Object.hasOwn(data, group.id)) input[group.id] = coerce(group, data[group.id]);
    return apply(input, {});
  }

  // The plain-text build sheet. A visual-test binding (shown on the skis, never priced)
  // is listed after the priced lines when the pack describes it.
  function text(config, {previewBinding = null} = {}) {
    const {amount, quote, currency} = total(config);
    const money = value => formatMoney(value, currency);
    const lines = bom(config).map(line => `${line.label}: ${line.value} — ${line.quote ? `quote ${money(line.quote[0])}–${money(line.quote[1])}` : line.price ? money(line.price) : 'Included'}`);
    if (previewBinding) {
      const visual = pack.exportVisual?.(previewBinding, config, context(config));
      if (visual) lines.push(visual);
    }
    const notes = groups
      .filter(group => group.type === 'text' && config[group.id])
      .map(group => `${group.label}: ${config[group.id]}`);
    const estimate = weight(config);
    return [
      pack.copy.exportTitle,
      '',
      ...(pack.exportHeader?.(config, context(config)) ?? []),
      ...lines,
      ...(notes.length ? ['', ...notes] : []),
      '',
      `${pack.copy.totalLabel ?? 'Reference total'}: ${money(amount)}${quote ? ` plus a quote of ${money(quote[0])}–${money(quote[1])}` : ''}`,
      ...(estimate ? [`Weight: ${formatWeight(estimate).text}`] : []),
      ready(config) ? '' : `${pack.copy.incompleteDraft ?? 'Incomplete draft: choose a model and length.'}\n`,
      ...pack.copy.exportNotes,
      '',
    ].join('\n');
  }

  const stepGroups = stepId => groups.filter(group => group.step === stepId);

  return {
    pack,
    groups,
    group: id => groupsById.get(id),
    steps: pack.steps,
    stepIndex: id => stepOfGroup.get(id),
    stepGroups,
    context,
    options,
    reason,
    format,
    defaults,
    normalize,
    prepare,
    apply,
    ready,
    missingForOrder,
    bom,
    total,
    weight,
    invalidateReviews,
    encode,
    decode,
    text,
    money: amount => formatMoney(amount, pack.currency ?? 'USD'),
  };
}

// ---------------------------------------------------------------------------
// Weight estimates
//
// {unit, per, base: {value, label}, items: [{label, min, max} | {label, direction, detail}]}
// Quantified items shift the range; direction-only items (published as
// "lighter"/"heavier" without a figure) bound it instead of inventing numbers.

export function combineWeight(estimate) {
  if (!estimate || estimate.base?.value == null) return null;
  let min = estimate.base.value;
  let max = estimate.base.value;
  let lighter = false;
  let heavier = false;
  for (const item of estimate.items ?? []) {
    if (item.direction) {
      if (item.direction < 0) lighter = true;
      else heavier = true;
    } else {
      min += item.min;
      max += item.max;
    }
  }
  return {min, max, lighter, heavier};
}

export function formatWeight(estimate) {
  const combined = combineWeight(estimate);
  if (!combined) return {text: 'Not published', value: null, qualifier: ''};
  const {min, max, lighter, heavier} = combined;
  const digits = estimate.digits ?? 0;
  const number = value => value.toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const unit = estimate.unit;
  const range = Math.abs(max - min) < 10 ** -digits / 2 ? number(min) : `${number(Math.min(min, max))}–${number(Math.max(min, max))}`;
  let value = range;
  let qualifier = '';
  if (lighter && !heavier) {
    value = `< ${number(Math.max(min, max))}`;
    qualifier = 'lighter by an unpublished amount';
  } else if (heavier && !lighter) {
    value = `> ${number(Math.min(min, max))}`;
    qualifier = 'heavier by an unpublished amount';
  } else if (lighter && heavier) {
    value = `≈ ${range}`;
    qualifier = 'includes changes that are not quantified';
  }
  return {text: `${value} ${unit}${estimate.per ? ` / ${estimate.per}` : ''}`, value, unit, per: estimate.per, qualifier};
}
