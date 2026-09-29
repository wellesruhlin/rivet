// Proteus field widgets for the shared configurator (attached to the pack's groups in
// App.jsx): the size finder, the design gallery with colorways and custom art, the build
// picker, the Adjustable Camber tuner and the sidewall text.
import {useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {ArrowDown, ImageUp, Search, Trash2, X} from 'lucide-react';
import {ArtSwatch, CheckMark, Note, priceLabel, RadioGroup, reducedMotion} from '@ski-studio/configurator';
import {artName, asset, BASE_COLORS, BASE_ZONES, baseColor, prepareUpload, TEMPLATE_IN, uploadedArt} from './brand/art.js';
import {artShape, profile as boardProfile, planform} from './brand/geometry.js';
import {catalog, collectionOf} from './brand/pack.js';
import {CAMBER_PRESETS, contactOffset, describeEnd, fitsRider, presetFor, SIZES, stiffnessOf, TRAVEL_MM} from './brand/specs.js';

const useUploads = () => useSyncExternalStore(uploadedArt.subscribe, uploadedArt.version, uploadedArt.version);

// ---------------------------------------------------------------------------
// Size

export function SizeField({group, config, ctx, update}) {
  const weight = config.riderWeight;
  const [draft, setDraft] = useState(weight ?? '');
  useEffect(() => setDraft(weight ?? ''), [weight]);
  const commit = value => {
    const n = Number(value);
    update({riderWeight: value === '' || !Number.isFinite(n) ? null : Math.round(n)});
  };
  const fits = SIZES.filter(size => fitsRider(size, weight));
  const shown = ctx.size ?? null;
  const chips = wide => SIZES.filter(size => size.wide === wide).map(size => ({
    value: size.id,
    label: size.id,
    fit: fitsRider(size, weight),
  }));
  const renderChip = option => (
    <>
      <span>{option.value.replace('W', '')}</span>
      {option.value.endsWith('W') && <small>W</small>}
      {option.fit && <i className="pt-fit-dot" aria-label="fits your weight" />}
    </>
  );
  return (
    <div className="pt-size">
      <label className="pt-weight">
        <span className="pt-weight-label">
          <strong>Your weight</strong>
          <small>Proteus sizes by rider weight</small>
        </span>
        <span className="pt-weight-input">
          <input
            type="number"
            inputMode="numeric"
            min="60"
            max="350"
            placeholder="—"
            aria-label="Your weight in pounds"
            value={draft}
            onChange={e => {setDraft(e.target.value); commit(e.target.value);}}
          />
          <em>lb</em>
        </span>
      </label>
      <p className="pt-fit-summary" aria-live="polite">
        {weight == null
          ? 'Enter your weight to see the sizes Proteus’s chart fits.'
          : fits.length
            ? `At ${weight} lb, Proteus’s chart fits ${fits.map(s => s.id).join(', ')}.`
            : `${weight} lb is outside Proteus’s chart (${SIZES[0].rider[0]}–${SIZES.at(-1).rider[1]} lb). Ask Proteus before you choose.`}
      </p>
      <div className="pt-size-rows">
        {[['Regular', false], ['Wide', true]].map(([label, wide]) => (
          <div key={label} className="pt-size-row">
            <span className="cfg-overline">{label}</span>
            <RadioGroup label={`${label} sizes`} className="cfg-length-row pt-length-row" itemClassName="cfg-length-chip pt-length-chip" options={chips(wide)} value={config[group.id]} onChange={value => update({[group.id]: value})} render={renderChip} />
          </div>
        ))}
      </div>
      {!shown && <p className="cfg-hint">Select a size to continue. We never choose one for you.</p>}
      {shown && (
        <dl className="cfg-spec-grid pt-size-specs" aria-label={`${shown.id} specifications`}>
          {[
            ['Rider weight', `${shown.rider[0]}–${shown.rider[1]} lb`],
            ['Effective edge', `${shown.edge} cm`],
            ['Sidecut radius', `${shown.radius} m`],
            ['Waist', `${shown.waist} cm`],
            ['Stance width', `${shown.stance[0]}–${shown.stance[1]} cm`],
            ['Bindings', shown.binding],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {shown?.wide && <p className="cfg-hint">Wide sizes keep the length and add 3–5 mm at the waist, for bigger boots.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Graphics

const PAGE = 12;
const FILTERS = [
  {value: 'all', label: 'All'},
  {value: 'proteus', label: 'Proteus'},
  {value: 'collaborations', label: 'Collaborations'},
  {value: 'fresh', label: 'New'},
];

function ColorwayChips({design, value, onChange}) {
  const options = design.colorways.map(c => ({value: c.name, label: c.name, image: asset(`art/top/${artName(design.id, c.name)}.webp`)}));
  return (
    <RadioGroup
      label={`${design.name} colorways`}
      className="pt-colorways"
      itemClassName="pt-colorway"
      options={options}
      value={value}
      onChange={onChange}
      render={(option, checked) => (
        <>
          <span className="pt-colorway-chip" style={{backgroundImage: `url("${option.image}")`}}>{checked && <CheckMark size={10} />}</span>
          <span className="pt-colorway-name">{option.label}</span>
        </>
      )}
    />
  );
}

function UploadPanel({config, update, openGuide, onView}) {
  useUploads();
  const upload = uploadedArt.get(config.artFile);
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async file => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      setError('Use a PNG, JPEG, WebP or SVG image. Proteus takes .ai files by email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const prepared = await prepareUpload(file);
      uploadedArt.set(file.name, prepared);
      update({artFile: file.name});
      onView('Topsheet');
    } catch {
      setError('This image could not be read. Try a PNG or JPEG.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const quality = upload && (upload.vector ? {tone: 'quiet', text: 'Vector artwork scales to any size. Proteus prefers .svg or .ai files.'}
    : upload.ppi >= 300 ? {tone: 'quiet', text: `Print-ready: about ${upload.ppi} ppi across the full 68 in template.`}
      : upload.ppi >= 72 ? {tone: 'quiet', text: `About ${upload.ppi} ppi at full size. Proteus accepts 72 ppi and prefers 300; a larger file will print sharper.`}
        : {tone: 'caution', text: `About ${upload.ppi} ppi at full size, under Proteus’s 72 ppi minimum. Send a larger file or vector art for production.`});
  return (
    <div className="pt-custom-block">
      <div className="pt-custom-head">
        <p className="cfg-overline">Topsheet artwork</p>
        <button type="button" className="cfg-text-button" onClick={() => openGuide('custom')}>Design guidelines</button>
      </div>
      <div
        className={`pt-drop ${busy ? 'is-busy' : ''}`}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {e.preventDefault(); choose(e.dataTransfer.files?.[0]);}}
      >
        <input ref={input} id="pt-art-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" className="cfg-sr-only" onChange={e => choose(e.target.files?.[0])} />
        {upload ? (
          <div className="pt-upload-row">
            <span className="pt-upload-thumb" style={{backgroundImage: `url("${upload.url}")`}} aria-hidden="true" />
            <span className="pt-upload-meta">
              <strong>{upload.name}</strong>
              <small>{upload.vector ? 'Vector image' : `${upload.width} × ${upload.height} px`}{upload.turned ? ' · turned so its left edge is the nose' : ''}</small>
            </span>
            <label htmlFor="pt-art-input" className="cfg-outline-button is-small">Replace</label>
            <button type="button" className="cfg-icon-button" aria-label="Remove artwork" onClick={() => update({artFile: ''})}>
              <Trash2 size={15} strokeWidth={1.7} />
            </button>
          </div>
        ) : (
          <label htmlFor="pt-art-input" className="pt-drop-label">
            <ImageUp size={20} strokeWidth={1.5} aria-hidden="true" />
            <span>
              <strong>{busy ? 'Preparing your artwork…' : 'Upload your artwork'}</strong>
              <small>PNG, JPEG, WebP or SVG · fills the {TEMPLATE_IN[1]} × {TEMPLATE_IN[0]} in template</small>
            </span>
          </label>
        )}
      </div>
      {error && <Note>{error}</Note>}
      {!upload && config.artFile && <Note>{`${config.artFile} was chosen on another visit. Images stay on the device that uploaded them; upload it again to see it here.`}</Note>}
      {quality && <Note tone={quality.tone}>{quality.text}</Note>}
      {upload?.trimmed && <p className="cfg-hint">Your image isn’t in the template’s 68 × 13 proportions, so its middle is used. Proteus asks for art that fills the full template.</p>}
      <p className="cfg-hint">Previewed on this device only. Proteus takes final files by email after your deposit and approves each one before production.</p>
    </div>
  );
}

function BaseColors({config, update, onView}) {
  return (
    <div className="pt-custom-block">
      <div className="pt-custom-head">
        <p className="cfg-overline">Base colors</p>
        <span className="cfg-field-note">{BASE_ZONES.map(zone => baseColor(config[zone.group]).label).join(' · ')}</span>
      </div>
      {BASE_ZONES.map(zone => (
        <div key={zone.group} className="pt-base-zone">
          <p className="pt-base-zone-label">
            <strong>{zone.label}</strong>
            <small>{zone.text}</small>
          </p>
          <RadioGroup
            label={`${zone.label} color`}
            className="pt-color-row"
            itemClassName="pt-color"
            options={BASE_COLORS}
            value={config[zone.group]}
            onChange={value => {update({[zone.group]: value}); onView('Base');}}
            render={(option, checked) => (
              <span className="pt-color-dot" style={{background: option.color}} title={option.label}>
                {checked && <CheckMark size={10} />}
                <span className="cfg-sr-only">{option.label}</span>
              </span>
            )}
          />
        </div>
      ))}
      <p className="cfg-hint">The layout is Proteus’s own base template: the trident prints in the body color and the wordmark in the logo-block color.</p>
    </div>
  );
}

export function DesignField({engine, group, config, ctx, update, onView, display, openGuide}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [locate, setLocate] = useState(0);
  const selectedTile = useRef(null);
  useUploads();
  useEffect(() => {
    if (locate) selectedTile.current?.scrollIntoView({block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth'});
  }, [locate]);
  const displayCtx = engine.context(display);
  const shape = useMemo(() => artShape(displayCtx.displaySize), [displayCtx.displaySize]);
  const swatch = item => engine.pack.art.swatch(item, group.id, display, displayCtx);
  const items = engine.options(group, config, ctx);
  const designs = items.filter(item => !item.extra);
  const custom = items.find(item => item.extra);
  const query = search.trim().toLowerCase();
  const filtered = designs.filter(item => item.label.toLowerCase().includes(query) && (filter === 'all' || (filter === 'fresh' ? item.fresh : item.collection === filter)));
  const shown = filtered.slice(0, limit);
  const selected = items.find(item => item.value === config[group.id]);
  const price = value => group.price?.(value, config, ctx) ?? 0;
  const choose = item => {
    update({[group.id]: item.value});
    onView('Topsheet');
  };
  const findSelected = () => {
    setSearch('');
    setFilter('all');
    setLimit(Math.max(PAGE, Math.ceil((designs.findIndex(item => item.value === selected.value) + 1) / PAGE) * PAGE));
    setLocate(n => n + 1);
  };
  const design = ctx.design;
  const ready = ctx.readyBoard;
  const readyNearby = !ctx.custom && !ready && catalog.offTheRack.filter(b => b.design === config.design && b.colorway === ctx.colorway?.name);

  return (
    <>
      {selected && (
        <div className="cfg-selection-card pt-selection">
          <ArtSwatch shape={shape} layers={swatch(selected)} className="cfg-selection-thumb pt-selection-thumb" />
          <div>
            <p className="cfg-overline">{ctx.custom ? 'Custom graphic' : collectionOf(design)?.id === 'collaborations' ? 'Artist & rider collaboration' : 'Proteus design'}</p>
            <p className="cfg-selection-name">{selected.label}</p>
            {!ctx.custom && <p className="cfg-selection-caption">{ctx.colorway?.name} · {design.colorways.length} {design.colorways.length === 1 ? 'colorway' : 'colorways'}</p>}
            {!ctx.custom && (
              <button type="button" className="cfg-text-button" onClick={findSelected}>
                Find in gallery
              </button>
            )}
          </div>
          <span className="cfg-selection-price">{priceLabel(engine, price(selected.value))}</span>
        </div>
      )}
      {!ctx.custom && design.colorways.length > 1 && <ColorwayChips design={design} value={ctx.colorway?.name} onChange={value => {update({colorway: value}); onView('Topsheet');}} />}
      {!ctx.custom && design.description && (
        <details className="cfg-choice-details pt-about-design">
          <summary>About {design.name}</summary>
          <p>{design.description.replace(/\s*As with all Proteus boards[\s\S]*$/, '')}</p>
        </details>
      )}
      {ready && (
        <Note tone="quiet">
          {`In stock now: Proteus lists this exact board, ${ready.name}, as a ready board at ${engine.money(ready.price)}${ready.condition === 'Brand New' ? ', new, waxed and shipping in 1–2 business days' : ` (${ready.condition.toLowerCase()} condition)`}.`}{' '}
          <a href={ready.source} target="_blank" rel="noreferrer">See it at Proteus</a>
        </Note>
      )}
      {readyNearby?.length > 0 && (
        <p className="cfg-hint">
          {`Ready to ride in this colorway: ${readyNearby.map(b => b.name).join(', ')} at Proteus.`}
        </p>
      )}
      {ctx.custom && (
        <>
          <UploadPanel config={config} update={update} openGuide={openGuide} onView={onView} />
          <BaseColors config={config} update={update} onView={onView} />
        </>
      )}

      <div className="pt-gallery-head">
        <p className="cfg-overline">All graphics</p>
      </div>
      <button type="button" className={`pt-custom-tile ${ctx.custom ? 'is-selected' : ''}`} aria-pressed={ctx.custom} onClick={() => choose(custom)}>
        <ImageUp size={20} strokeWidth={1.5} aria-hidden="true" />
        <span>
          <strong>Your own artwork</strong>
          <small>Your art on the topsheet, your colors on the base</small>
        </span>
        <em>+{engine.money(price('custom'))}</em>
        {ctx.custom && <CheckMark />}
      </button>
      <label className="cfg-search pt-search">
        <Search size={17} strokeWidth={1.7} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search designs"
          placeholder={`Search ${designs.length} designs`}
          value={search}
          onChange={e => {setSearch(e.target.value); setLimit(PAGE);}}
        />
        {search && (
          <button type="button" className="cfg-icon-button" aria-label="Clear search" onClick={() => setSearch('')}>
            <X size={15} />
          </button>
        )}
      </label>
      <div className="cfg-gallery-toolbar">
        <RadioGroup label="Collection" className="cfg-filter-row" itemClassName="cfg-filter-chip" options={FILTERS} value={filter} onChange={value => {setFilter(value); setLimit(PAGE);}} />
      </div>
      <p className="cfg-gallery-meta">
        <span>{filtered.length} {filtered.length === 1 ? 'design' : 'designs'}</span>
        Collaborations add {engine.money(price(designs.find(d => d.collection === 'collaborations')?.value))}
      </p>
      <div className="cfg-art-grid pt-art-grid">
        {shown.map(item => {
          const chosen = item.value === config[group.id];
          const extra = price(item.value);
          return (
            <button
              type="button"
              key={item.value}
              ref={chosen ? selectedTile : undefined}
              className={`cfg-art-tile ${chosen ? 'is-selected' : ''}`}
              aria-pressed={chosen}
              aria-label={`${item.label}, ${item.colorways} ${item.colorways === 1 ? 'colorway' : 'colorways'}${extra ? `, adds ${engine.money(extra)}` : ''}`}
              onClick={() => choose(item)}
            >
              <span className="cfg-art-tile-frame">
                <ArtSwatch shape={shape} layers={swatch(item)} />
                {chosen && <CheckMark />}
                {item.fresh && <span className="pt-tile-badge">New</span>}
              </span>
              <span className="cfg-art-tile-name">{item.label}</span>
              <span className="cfg-art-tile-price">
                {item.colorways} {item.colorways === 1 ? 'colorway' : 'colorways'}
                {extra > 0 && ` · +${engine.money(extra)}`}
              </span>
            </button>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="cfg-empty">
          <Search size={22} strokeWidth={1.5} aria-hidden="true" />
          <h3>No designs found</h3>
          <p>Try a shorter name, or show all collections.</p>
          <button type="button" className="cfg-outline-button" onClick={() => {setSearch(''); setFilter('all');}}>
            Clear filters
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <button type="button" className="cfg-load-more" onClick={() => setLimit(l => l + PAGE)}>
          Show {Math.min(PAGE, filtered.length - limit)} more <ArrowDown size={15} strokeWidth={1.7} />
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Build

function Gauge({value, label}) {
  return (
    <span className="pt-gauge" role="img" aria-label={label}>
      <i style={{left: `${value * 100}%`}} />
    </span>
  );
}

export function StiffnessField({engine, group, config, ctx, update}) {
  const options = engine.options(group, config, ctx);
  const build = stiffnessOf(config[group.id]);
  return (
    <>
      <RadioGroup
        label="Build"
        className="cfg-card-grid pt-builds"
        itemClassName="cfg-card pt-build"
        options={options}
        value={config[group.id]}
        onChange={value => update({[group.id]: value})}
        render={option => {
          const b = stiffnessOf(option.value);
          return (
            <>
              <span className="cfg-card-top">
                <span className="cfg-card-title">{option.label}</span>
                <span className="pt-build-price">{priceLabel(engine, group.price(option.value, config, ctx))}</span>
              </span>
              <Gauge value={b.scale} label={`${option.label}: ${Math.round(b.scale * 100)}% of the way from soft and playful to stiff and aggressive`} />
              <span className="cfg-card-text">{b.summary}</span>
              {option.badge && <span className="cfg-card-meta">{option.badge}</span>}
            </>
          );
        }}
      />
      <div className="pt-gauge-legend" aria-hidden="true">
        <span>Soft &amp; playful</span>
        <span>Stiff &amp; aggressive</span>
      </div>
      <dl className="cfg-spec-grid pt-layup" aria-label={`${build.label} build layup`}>
        {[
          ['Top sheet', build.top],
          ['Bottom sheet', build.bottom],
          ['Reinforcement', `${build.reinforcement} patches`],
          ['Every build', 'Calculated carbon · Thru-Stitch Kevlar'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="cfg-hint">The Inside view shows the {build.label} layup; its glass sheets are highlighted in the legend.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Camber

// A side profile as an SVG path, heights exaggerated. The nose is on the left, as the
// 3D Camber view shows it.
function profilePath(size, nose, tail, {width = 300, height = 56, exaggeration = 5, pad = 4} = {}) {
  const {L} = planform(size);
  const p = boardProfile(size, nose, tail);
  const points = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    points.push([pad + (width - 2 * pad) * i / 120, height - pad - p.heightAt(u) * exaggeration * (width - 2 * pad) / L]);
  }
  return {d: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '), p};
}

function ProfileGlyph({size, nose, tail}) {
  const {d} = profilePath(size, nose, tail, {width: 120, height: 30, exaggeration: 7, pad: 3});
  return (
    <svg className="pt-glyph" viewBox="0 0 120 30" aria-hidden="true">
      <line x1="2" x2="118" y1="27.5" y2="27.5" className="pt-glyph-snow" />
      <path d={d} className="pt-glyph-board" />
    </svg>
  );
}

function Screw({end, value, onChange}) {
  const offset = contactOffset(value);
  const describe = `${describeEnd(value)} at the end of the effective edge`;
  return (
    <div className="pt-screw">
      <div className="pt-screw-head">
        <label htmlFor={`pt-screw-${end}`}>
          <strong>{end === 'nose' ? 'Nose' : 'Tail'} screw</strong>
        </label>
        <output htmlFor={`pt-screw-${end}`} className={offset < -.5 ? 'is-camber' : offset > .5 ? 'is-rocker' : 'is-flat'}>{describeEnd(value)}</output>
      </div>
      <input
        id={`pt-screw-${end}`}
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        aria-valuetext={describe}
        style={{'--fill': `${value}%`}}
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className="pt-screw-scale" aria-hidden="true">
        <span>Full camber</span>
        <span>Flat</span>
        <span>Full rocker</span>
      </div>
    </div>
  );
}

export function CamberField({engine, config, ctx, update, onView, openGuide}) {
  const size = ctx.displaySize;
  const {nose, tail} = config;
  const preset = presetFor(nose, tail);
  const set = patch => {update(patch); onView('Camber');};
  const {d, p} = profilePath(size, nose, tail);
  const snow = 52;
  return (
    <>
      <RadioGroup
        label="Camber settings from Proteus"
        className="pt-presets"
        itemClassName="pt-preset"
        options={CAMBER_PRESETS.map(pr => ({value: pr.id, label: pr.label, preset: pr}))}
        value={preset?.id ?? ''}
        onChange={id => {const pr = CAMBER_PRESETS.find(x => x.id === id); set({nose: pr.nose, tail: pr.tail});}}
        render={(option, checked) => (
          <>
            <ProfileGlyph size={size} nose={option.preset.nose} tail={option.preset.tail} />
            <span className="pt-preset-name">{option.label}</span>
            {checked && <CheckMark size={10} />}
          </>
        )}
      />
      <p className="cfg-hint pt-preset-text" aria-live="polite">
        {preset ? preset.text : `Your own setting: nose ${describeEnd(nose)}, tail ${describeEnd(tail)}. Each end sets independently, anywhere between full camber and full rocker.`}
      </p>
      <figure className="pt-profile">
        <svg viewBox="0 0 300 66" role="img" aria-label={`Side profile: ${preset?.label ?? 'custom setting'}. Nose on the left.`}>
          <line x1="0" x2="300" y1={snow} y2={snow} className="pt-profile-snow" />
          <path d={d} className="pt-profile-board" />
          <text x="4" y="65" className="pt-profile-label">Nose</text>
          <text x="296" y="65" textAnchor="end" className="pt-profile-label">Tail</text>
        </svg>
        <figcaption>
          {Math.abs(p.centerMm) >= .5 ? `Center ${p.centerMm.toFixed(1)} mm off the snow` : 'Center on the snow'}
          {' · '}heights ×5 · {size.id}
        </figcaption>
      </figure>
      <div className="pt-screws">
        <Screw end="nose" value={nose} onChange={value => set({nose: value})} />
        <Screw end="tail" value={tail} onChange={value => set({tail: value})} />
      </div>
      <p className="cfg-hint">
        Proteus: each end moves up to 1.2 in ({TRAVEL_MM} mm) at the end of the effective edge, and the indicator’s center line is flat. Return to full camber at the end of the day to keep the board performing.{' '}
        <button type="button" className="cfg-text-button" onClick={() => openGuide('camber')}>Camber guide</button>
      </p>
      {(nose !== 0 || tail !== 0) && (
        <button type="button" className="cfg-outline-button is-small pt-reset" onClick={() => set({nose: 0, tail: 0})}>
          Back to full camber
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sidewall text

export function SidewallField({group, config, update, onView}) {
  const value = config[group.id] ?? '';
  const [rejected, setRejected] = useState(false);
  return (
    <div className="pt-sidewall">
      <label className="cfg-text-field" htmlFor="pt-sidewall-text">
        <span className="cfg-overline">Sidewall text · free</span>
        <span className="pt-sidewall-input">
          <input
            id="pt-sidewall-text"
            type="text"
            value={value}
            maxLength={group.maxLength}
            placeholder="Up to 12 letters or numbers"
            autoComplete="off"
            spellCheck="false"
            onFocus={() => onView('Sidewall')}
            onChange={e => {
              const clean = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, group.maxLength);
              setRejected(clean !== e.target.value.slice(0, group.maxLength));
              update({[group.id]: clean});
            }}
          />
          <em aria-live="polite">{value.length} / {group.maxLength}</em>
        </span>
      </label>
      <p className="cfg-hint">{rejected ? 'Letters and numbers only: Proteus doesn’t print spaces or symbols.' : 'Printed along the sidewall, centered on the board. Letters and numbers only.'}</p>
      <div className="pt-sidewall-strip" aria-hidden="true">
        <span>{value || 'YOURTEXT'}</span>
      </div>
    </div>
  );
}

// Attaches the widgets to the pack's groups (the pack itself stays free of React).
export function attachWidgets(engine) {
  const widgets = {length: SizeField, design: DesignField, stiffness: StiffnessField, nose: CamberField, sidewallText: SidewallField};
  for (const [id, widget] of Object.entries(widgets)) engine.group(id).ui = {...engine.group(id).ui, widget};
  // The custom art and base colors live inside the design field.
  for (const id of ['artFile', 'baseNose']) engine.group(id).ui = {...engine.group(id).ui, visible: () => false};
}


