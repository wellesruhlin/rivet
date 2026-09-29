import {useState} from 'react';
import {ArrowDown, Search} from 'lucide-react';
import {artworkPrice, catalog, filterGraphics, getBase, getTop, money, sidewallPrice, sidewalls} from '../config.js';
import {CheckMark, PanelHead, RadioGroup} from '../components/Controls.jsx';
import ArtSwatch from '../components/ArtSwatch.jsx';
import {Note} from './ShapePanel.jsx';

const PAGE = 12;
const MODES = ['Topsheet', 'Base', 'Sidewalls'].map(value => ({value, label: value}));
const FILTERS = ['All', 'Blackout', 'Color', 'Graphic', 'Wood'];
const priceLabel = price => (price ? `+${money(price)}` : 'Included');

function SidewallPicker({config, update, onView}) {
  return (
    <>
      <div className="selection-card">
        <span className="selection-chip" style={{'--swatch': sidewalls.find(([name]) => name === config.sidewall)[1]}} aria-hidden="true" />
        <div>
          <p className="overline">Sidewall color</p>
          <p className="selection-name">{config.sidewall}</p>
        </div>
        <span className="selection-price">{priceLabel(sidewallPrice(config.sidewall))}</span>
      </div>
      <RadioGroup
        label="Sidewall color"
        className="swatch-row"
        itemClassName="swatch"
        options={sidewalls.map(([value, hex]) => ({value, hex}))}
        value={config.sidewall}
        onChange={sidewall => {update({sidewall}); onView('Sidewall');}}
        render={(option, checked) => (
          <>
            <span className="swatch-chip" style={{'--swatch': option.hex}}>
              {checked && <CheckMark size={13} />}
            </span>
            <span className="swatch-name">{option.value}</span>
          </>
        )}
      />
      <p className="body-copy">The same full-height UHMW sidewall in a different finish. Black is included; every other color adds $50.</p>
      <Note tone="quiet">Drag the ski to see the full-height sidewall. Actual color and dimensions may differ on a finished ski.</Note>
    </>
  );
}

export default function GraphicsPanel({config, update, onView, initialMode = 'Topsheet', onMode}) {
  const mode = initialMode;
  const [filter, setFilter] = useState('All');
  const [limit, setLimit] = useState(PAGE);

  const isBase = mode === 'Base';
  const kind = isBase ? 'base' : 'top';
  const list = isBase ? catalog.bases : catalog.tops;
  const selected = isBase ? getBase(config) : getTop(config);
  const filtered = filterGraphics(list, '', filter);
  const shown = filtered.slice(0, limit);
  const filters = FILTERS.filter(f => !isBase || !['Blackout', 'Wood'].includes(f));

  const changeMode = next => {
    onMode(next === 'Base' ? 'base' : next === 'Sidewalls' ? 'sidewall' : 'top');
    setFilter('All');
    setLimit(PAGE);
    onView(next === 'Sidewalls' ? 'Sidewall' : next);
  };
  const choose = graphic => {
    update({[kind]: graphic.id});
    onView(mode);
  };

  return (
    <div className="graphics-panel">
      <PanelHead index={1} title="Graphics">
        Original ON3P artwork, in your combination.
      </PanelHead>
      <RadioGroup label="Artwork surface" className="segmented block" options={MODES} value={mode} onChange={changeMode} />

      {mode === 'Sidewalls' ? (
        <SidewallPicker config={config} update={update} onView={onView} />
      ) : (
        <>
          <div className="gallery-toolbar">
            <RadioGroup
              label="Artwork type"
              className="filter-row"
              itemClassName="filter-chip"
              options={filters.map(value => ({value, label: value}))}
              value={filter}
              onChange={value => {
                setFilter(value);
                setLimit(PAGE);
              }}
            />
          </div>
          <p className="gallery-meta">
            <span>
              {filtered.length} {filtered.length === 1 ? 'design' : 'designs'}
            </span>
            Designs keep their place as you choose
          </p>

          <div className="art-grid">
            {shown.map(graphic => {
              const chosen = graphic.id === selected.id;
              const price = artworkPrice(kind, graphic.id);
              return (
                <button
                  type="button"
                  key={graphic.id}
                  className={`art-tile ${chosen ? 'is-selected' : ''}`}
                  aria-pressed={chosen}
                  aria-label={`${graphic.name}${price ? `, adds ${money(price)}` : ''}`}
                  onClick={() => choose(graphic)}
                >
                  <span className="art-tile-frame">
                    <ArtSwatch graphic={graphic} kind={kind} />
                    {chosen && <CheckMark />}
                  </span>
                  <span className="art-tile-name">{graphic.name}</span>
                  {price > 0 && <span className="art-tile-price">+{money(price)}</span>}
                </button>
              );
            })}
          </div>

          {!filtered.length && (
            <div className="empty-state">
              <Search size={22} strokeWidth={1.5} aria-hidden="true" />
              <h3>No artwork found</h3>
              <p>Try another artwork category.</p>
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setFilter('All');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {filtered.length > limit && (
            <button type="button" className="load-more" onClick={() => setLimit(l => l + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more <ArrowDown size={15} strokeWidth={1.7} />
            </button>
          )}
          {!isBase && selected.name.startsWith('Wood ') && (
            <p className="hint">Wood veneer adds $250. ON3P’s builder lists approximately 50 days for wood tops; confirm the current ship date before ordering.</p>
          )}
          <p className="fine">Public catalog snapshot. Custom uploads and mix-and-match art are outside this concept.</p>
        </>
      )}
    </div>
  );
}
