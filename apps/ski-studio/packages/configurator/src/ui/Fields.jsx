import {useEffect, useRef, useState} from 'react';
import {ArrowDown, ChevronDown, Search, X} from 'lucide-react';
import {CheckMark, Field, Note, RadioDot, RadioGroup, reducedMotion, useRadioGroup} from './Controls.jsx';
import ArtSwatch from './ArtSwatch.jsx';
import BindingField from './BindingField.jsx';

// Price label for an option: included, a surcharge, or a quote range.
export function priceLabel(engine, price) {
  if (price && typeof price === 'object') return `Quote ${engine.money(price.quote[0])}–${engine.money(price.quote[1])}`;
  return price ? `${price > 0 ? '+' : '−'}${engine.money(Math.abs(price))}` : 'Included';
}

const asList = value => (Array.isArray(value) ? value : value ? [value] : []);

function Hints({group, config, ctx, id}) {
  const hints = asList(group.ui?.hint?.(config, ctx));
  return hints.map((hint, i) => (
    <p key={i} id={i === 0 ? id : undefined} className="cfg-hint">
      {hint}
    </p>
  ));
}

function GroupNote({group, config, ctx}) {
  const note = group.ui?.note?.(config, ctx);
  return note ? <Note tone={note.tone ?? 'caution'}>{note.text}</Note> : null;
}

// Options with availability applied; reasons explain disabled choices.
function useOptions(engine, group, config, ctx) {
  return engine.options(group, config, ctx).map(option => {
    const value = option.value;
    const reason = option.disabled ? option.reason ?? '' : engine.reason(group, value, config, ctx);
    return {...option, value, disabled: !!option.disabled || !!reason, reason};
  });
}

function CategoryCards({engine, group, config, ctx, update}) {
  const options = useOptions(engine, group, config, ctx);
  return (
    <RadioGroup
      label={group.ui?.field ?? group.label}
      className="cfg-card-grid"
      itemClassName="cfg-card cfg-card-category"
      options={options}
      value={config[group.id]}
      onChange={value => update({[group.id]: value})}
      render={(option, checked) => (
        <>
          <span className="cfg-card-top">
            <span className="cfg-card-title">{option.label}</span>
            <RadioDot checked={checked} />
          </span>
          {option.description && <span className="cfg-card-text">{option.description}</span>}
          {option.meta && <span className="cfg-card-meta">{option.meta}</span>}
        </>
      )}
    />
  );
}

function ModelSelect({engine, group, config, ctx, update}) {
  const options = useOptions(engine, group, config, ctx);
  const description = group.ui?.description?.(config, ctx);
  return (
    <>
      <div className="cfg-select">
        <select aria-label={group.ui?.selectLabel?.(config, ctx) ?? group.label} value={config[group.id]} onChange={e => update({[group.id]: e.target.value})}>
          <option value="" disabled>
            {group.ui?.placeholder?.(config, ctx) ?? `Choose your ${group.label.toLowerCase()}`}
          </option>
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden="true" />
      </div>
      {description && (
        <details className="cfg-choice-details">
          <summary>{group.ui?.descriptionLabel ?? 'About this ski'}</summary>
          <p>{description}</p>
        </details>
      )}
    </>
  );
}

function LengthChips({engine, group, config, ctx, update}) {
  const options = useOptions(engine, group, config, ctx).map(option => ({...option, label: option.label ?? String(option.value)}));
  return <RadioGroup label={group.ui?.field ?? group.label} className="cfg-length-row" itemClassName="cfg-length-chip" options={options} value={config[group.id]} onChange={value => update({[group.id]: value})} />;
}

function ChoiceCards({engine, group, config, ctx, update, describedBy}) {
  const options = useOptions(engine, group, config, ctx).map(option => ({...option, describedBy}));
  return (
    <RadioGroup
      label={group.ui?.field ?? group.label}
      className={`cfg-card-grid ${options.length > 2 ? 'is-compact' : ''}`}
      itemClassName="cfg-card"
      options={options}
      value={config[group.id]}
      onChange={value => update({[group.id]: value})}
      render={(option, checked) => (
        <>
          <span className="cfg-card-top">
            <span className="cfg-card-title">{option.label}</span>
            <RadioDot checked={checked} />
          </span>
          {option.text && <span className="cfg-card-text">{option.text}</span>}
        </>
      )}
    />
  );
}

function Segmented({engine, group, config, ctx, update, describedBy}) {
  const options = useOptions(engine, group, config, ctx).map(option => ({...option, label: option.short ?? option.label, describedBy}));
  return <RadioGroup label={group.ui?.field ?? group.label} className="cfg-segmented is-block" options={options} value={config[group.id]} onChange={value => update({[group.id]: value})} />;
}

function ChoiceList({engine, group, config, ctx, update}) {
  const options = useOptions(engine, group, config, ctx);
  const radio = useRadioGroup(options, config[group.id], value => update({[group.id]: value}));
  return (
    <div role="radiogroup" aria-label={group.ui?.field ?? group.label} className="cfg-option-list">
      {options.map((option, i) => {
        const checked = option.value === config[group.id];
        const noteId = `${group.id}-note-${i}`;
        const price = group.price ? group.price(option.value, config, ctx) : 0;
        return (
          <div key={option.value} className={`cfg-option ${checked ? 'is-selected' : ''} ${option.disabled ? 'is-disabled' : ''}`}>
            <button {...radio(i)} className="cfg-option-button" aria-describedby={option.reason || checked ? noteId : undefined}>
              <RadioDot checked={checked} />
              <span className="cfg-option-name">
                <strong>
                  {option.label}
                  {option.badge && <em className="cfg-badge">{option.badge}</em>}
                </strong>
                {option.tag && <small>{option.tag}</small>}
              </span>
              <span className="cfg-option-price">{priceLabel(engine, price)}</span>
            </button>
            {option.reason && (
              <p className="cfg-option-reason" id={noteId}>
                {option.reason}
              </p>
            )}
            {checked && (option.description || option.specs) && (
              <div className="cfg-option-detail" id={noteId}>
                {option.description && <p>{option.description}</p>}
                {option.tradeoff && <p className="cfg-tradeoff">{option.tradeoff}</p>}
                {option.specs && (
                  <dl className="cfg-spec-grid">
                    {option.specs.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SwatchChip({option}) {
  const style = option.image ? {'--swatch': `url("${option.image}") center / cover`} : {'--swatch': option.color};
  return <span className={`cfg-swatch-chip ${option.image ? 'is-image' : ''}`} style={style} />;
}

function Swatches({engine, group, config, ctx, update}) {
  const options = useOptions(engine, group, config, ctx);
  const selected = options.find(option => option.value === config[group.id]);
  const price = group.price ? group.price(config[group.id], config, ctx) : 0;
  const body = group.ui?.bodyCopy?.(config, ctx);
  return (
    <>
      {group.ui?.selectionCard !== false && selected && (
        <div className="cfg-selection-card">
          <SwatchChip option={selected} />
          <div>
            <p className="cfg-overline">{group.ui?.selectionLabel ?? group.label}</p>
            <p className="cfg-selection-name">{selected.label}</p>
            {selected.caption && <p className="cfg-selection-caption">{selected.caption}</p>}
          </div>
          <span className="cfg-selection-price">{priceLabel(engine, price)}</span>
        </div>
      )}
      <RadioGroup
        label={group.ui?.field ?? group.label}
        className={`cfg-swatch-row ${group.ui?.swatchSize === 'large' ? 'is-large' : ''}`}
        itemClassName="cfg-swatch"
        options={options}
        value={config[group.id]}
        onChange={value => update({[group.id]: value})}
        render={(option, checked) => (
          <>
            <span className="cfg-swatch-frame">
              <SwatchChip option={option} />
              {checked && <CheckMark size={12} />}
            </span>
            <span className="cfg-swatch-name">{option.short ?? option.label}</span>
          </>
        )}
      />
      {body && <p className="cfg-body-copy">{body}</p>}
    </>
  );
}

const PAGE = 12;

function Gallery({engine, group, config, ctx, update, onView, display}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [limit, setLimit] = useState(PAGE);
  const [locate, setLocate] = useState(0);
  const selectedTile = useRef(null);
  useEffect(() => {
    if (locate) selectedTile.current?.scrollIntoView({block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth'});
  }, [locate]);

  const items = engine.options(group, config, ctx);
  // `extra` options (such as "No artwork") are listed but not counted as designs.
  const designs = list => list.filter(item => !item.extra).length;
  const filters = group.ui?.filters?.(config, ctx) ?? [];
  const query = search.trim().toLowerCase();
  const filtered = items.filter(item => (item.label ?? '').toLowerCase().includes(query) && (filter === 'All' || group.ui.filterOf(item) === filter));
  const shown = filtered.slice(0, limit);
  const selected = items.find(item => item.value === config[group.id]);
  const shape = engine.pack.art.shape(display, engine.context(display));
  const swatch = item => engine.pack.art.swatch(item, group.id, display, engine.context(display));
  const choose = item => {
    update({[group.id]: item.value});
    if (group.ui?.view) onView(group.ui.view);
  };
  const findSelected = () => {
    setSearch('');
    setFilter('All');
    setLimit(Math.max(PAGE, Math.ceil((items.findIndex(item => item.value === selected.value) + 1) / PAGE) * PAGE));
    setLocate(n => n + 1);
  };
  const notes = asList(group.ui?.hint?.(config, ctx));

  return (
    <>
      {selected && (
        <div className="cfg-selection-card">
          <ArtSwatch shape={shape} layers={swatch(selected)} className="cfg-selection-thumb" />
          <div>
            <p className="cfg-overline">{group.ui?.selectionLabel ?? `Selected ${group.label.toLowerCase()}`}</p>
            <p className="cfg-selection-name">{selected.label}</p>
            <button type="button" className="cfg-text-button" onClick={findSelected}>
              Find in gallery
            </button>
          </div>
          <span className="cfg-selection-price">{priceLabel(engine, group.price?.(selected.value, config, ctx) ?? 0)}</span>
        </div>
      )}

      <label className="cfg-search">
        <Search size={17} strokeWidth={1.7} aria-hidden="true" />
        <input
          type="search"
          aria-label={`Search ${group.label.toLowerCase()} artwork`}
          placeholder={group.ui?.searchPlaceholder?.(designs(items)) ?? `Search ${designs(items)} designs`}
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setLimit(PAGE);
          }}
        />
        {search && (
          <button type="button" className="cfg-icon-button" aria-label="Clear search" onClick={() => setSearch('')}>
            <X size={15} />
          </button>
        )}
      </label>

      {filters.length > 1 && (
        <div className="cfg-gallery-toolbar">
          <RadioGroup
            label="Artwork type"
            className="cfg-filter-row"
            itemClassName="cfg-filter-chip"
            options={filters.map(value => ({value, label: value}))}
            value={filter}
            onChange={value => {
              setFilter(value);
              setLimit(PAGE);
            }}
          />
        </div>
      )}
      <p className="cfg-gallery-meta">
        <span>
          {designs(filtered)} {designs(filtered) === 1 ? 'design' : 'designs'}
        </span>
        Designs keep their place as you choose
      </p>

      <div className="cfg-art-grid">
        {shown.map(item => {
          const chosen = item.value === config[group.id];
          const price = group.price?.(item.value, config, ctx) ?? 0;
          return (
            <button
              type="button"
              key={item.value}
              ref={chosen ? selectedTile : undefined}
              className={`cfg-art-tile ${chosen ? 'is-selected' : ''}`}
              aria-pressed={chosen}
              aria-label={`${item.label}${price ? `, adds ${engine.money(price)}` : ''}`}
              onClick={() => choose(item)}
            >
              <span className="cfg-art-tile-frame">
                <ArtSwatch shape={shape} layers={swatch(item)} />
                {chosen && <CheckMark />}
              </span>
              <span className="cfg-art-tile-name">{item.label}</span>
              {price > 0 && <span className="cfg-art-tile-price">+{engine.money(price)}</span>}
            </button>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="cfg-empty">
          <Search size={22} strokeWidth={1.5} aria-hidden="true" />
          <h3>No artwork found</h3>
          <p>Try a color or a shorter name.</p>
          <button
            type="button"
            className="cfg-outline-button"
            onClick={() => {
              setSearch('');
              setFilter('All');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <button type="button" className="cfg-load-more" onClick={() => setLimit(l => l + PAGE)}>
          Show {Math.min(PAGE, filtered.length - limit)} more <ArrowDown size={15} strokeWidth={1.7} />
        </button>
      )}
      {notes.map((note, i) => (
        <p key={i} className="cfg-hint">
          {note}
        </p>
      ))}
    </>
  );
}

function SwitchRow({engine, group, config, ctx, update}) {
  const reason = engine.reason(group, true, config, ctx);
  const fixed = group.fixed?.(config, ctx);
  const disabled = fixed !== undefined || !!reason;
  const price = group.ui?.priceLabel?.(config, ctx) ?? priceLabel(engine, group.price?.(true, config, ctx) ?? 0);
  return (
    <label className={`cfg-switch-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="cfg-switch-copy">
        <strong>{group.ui?.title ?? group.label}</strong>
        <small>{reason || group.ui?.description}</small>
      </span>
      <span className="cfg-switch-price">{price}</span>
      <input type="checkbox" role="switch" className="cfg-switch" checked={!!config[group.id]} disabled={disabled} onChange={e => update({[group.id]: e.target.checked})} />
    </label>
  );
}

function TextField({group, config, update}) {
  const [value, setValue] = useState(config[group.id] ?? '');
  useEffect(() => setValue(config[group.id] ?? ''), [config[group.id]]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => value !== config[group.id] && update({[group.id]: value});
  const props = {
    id: `cfg-${group.id}`,
    value,
    placeholder: group.ui?.placeholder,
    maxLength: group.maxLength ?? 500,
    onChange: e => setValue(e.target.value),
    onBlur: commit,
  };
  return (
    <label className="cfg-text-field" htmlFor={props.id}>
      <span className="cfg-overline">{group.ui?.field ?? group.label}</span>
      {group.ui?.multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
    </label>
  );
}

// A compact two-column choice with the selected option's details on demand.
function CompactChoices({engine, group, config, ctx, update}) {
  const options = useOptions(engine, group, config, ctx);
  const selected = options.find(option => option.value === config[group.id]);
  return (
    <>
      <RadioGroup
        label={group.ui?.field ?? group.label}
        className="cfg-compact-grid"
        itemClassName="cfg-compact-option"
        options={options}
        value={config[group.id]}
        onChange={value => update({[group.id]: value})}
        render={(option, checked) => (
          <>
            <RadioDot checked={checked} />
            <span className="cfg-compact-name">
              {option.label}
              {option.badge && <em className="cfg-badge">{option.badge}</em>}
            </span>
            <span className="cfg-compact-price">{priceLabel(engine, group.price ? group.price(option.value, config, ctx) : 0)}</span>
            {option.reason && <span className="cfg-compact-reason">{option.reason}</span>}
          </>
        )}
      />
      {selected && (selected.description || selected.specs) && (
        <details className="cfg-choice-details">
          <summary>About {selected.label}</summary>
          {selected.description && <p>{selected.description}</p>}
          {selected.specs && (
            <dl className="cfg-spec-grid">
              {selected.specs.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </details>
      )}
    </>
  );
}

const WIDGETS = {
  binding: BindingField,
  category: CategoryCards,
  model: ModelSelect,
  length: LengthChips,
  gallery: Gallery,
  toggle: SwitchRow,
  text: TextField,
};
const CHOICE_WIDGETS = {cards: ChoiceCards, segmented: Segmented, list: ChoiceList, swatches: Swatches, compact: CompactChoices};

export function widgetFor(group) {
  // A pack can bring its own field widget (for example a camber tuner).
  if (group.ui?.widget) return group.ui.widget;
  if (group.type === 'choice') return CHOICE_WIDGETS[group.ui?.display ?? 'cards'];
  return WIDGETS[group.type];
}

// One option group with its label, action, hints and notes.
export function GroupField(props) {
  const {group} = props;
  if (group.type === 'category' && group.ui?.collapse) return <CollapsingCategory {...props} />;
  return <FieldBody {...props} bare={props.bare || group.type === 'binding' || !!group.ui?.bare} />;
}

// Once chosen, a category collapses to a one-line summary; "Change" reopens the cards.
function CollapsingCategory(props) {
  const {engine, group, config} = props;
  const [open, setOpen] = useState(!config[group.id]);
  const ctx = engine.context(config);
  const chosen = engine.options(group, config, ctx).find(option => option.value === config[group.id]);
  if (chosen && !open) {
    return (
      <button type="button" className="cfg-choice-summary" aria-expanded={false} onClick={() => setOpen(true)}>
        <span>
          <small>{group.ui?.summaryLabel ?? group.ui?.field ?? group.label}</small>
          <strong>{chosen.label}</strong>
        </span>
        <span className="cfg-summary-change">
          Change <ChevronDown size={15} aria-hidden="true" />
        </span>
      </button>
    );
  }
  const update = patch => {
    props.update(patch);
    setOpen(false);
  };
  const done = chosen && (
    <button type="button" className="cfg-text-button" onClick={() => setOpen(false)}>
      Done
    </button>
  );
  return <FieldBody {...props} update={update} actionOverride={done} />;
}

function FieldBody({engine, group, config, update, onView, openGuide, display, binding, bare = false, actionOverride}) {
  const ctx = engine.context(config);
  const Widget = widgetFor(group);
  const hintId = `${group.id}-hint`;
  const action = group.ui?.action && (group.ui.action.visible?.(config, ctx) ?? true) && (
    <button type="button" className="cfg-text-button" onClick={() => openGuide(group.ui.action.guide)}>
      {group.ui.action.label}
    </button>
  );
  const fieldNote = group.ui?.fieldNote?.(config, ctx);
  const content = (
    <>
      <Widget engine={engine} group={group} config={config} ctx={ctx} update={update} onView={onView} openGuide={openGuide} display={display} describedBy={hintId} binding={binding} />
      {group.type !== 'gallery' && <Hints group={group} config={config} ctx={ctx} id={hintId} />}
      <GroupNote group={group} config={config} ctx={ctx} />
    </>
  );
  // Tabbed steps already name the group in the tab, so the field label is omitted.
  if (bare || group.type === 'text' || group.type === 'toggle') return content;
  return (
    <Field label={group.ui?.field ?? group.label} action={actionOverride || action || (fieldNote && <span className="cfg-field-note">{fieldNote}</span>)}>
      {content}
    </Field>
  );
}
