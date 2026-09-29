import {Check} from 'lucide-react';
import {PRICES, flexOptions, flexPrice, layups, money, optionReason, rulesFor} from '../config.js';
import {Field, PanelHead, RadioGroup, useRadioGroup} from '../components/Controls.jsx';

const priceLabel = price => (price ? `+${money(price)}` : 'Included');

function LayupList({config, update, onView}) {
  const options = layups.map(layup => ({value: layup.id, layup, reason: optionReason(config, 'layup', layup.id)})).map(o => ({...o, disabled: !!o.reason}));
  const selected = layups.find(layup => layup.id === config.layup);
  const radio = useRadioGroup(options, config.layup, layup => {update({layup}); onView('Construction');});
  return (
    <><div role="radiogroup" aria-label="Layup" className="layup-list compact-layups">
      {options.map(({layup, reason}, i) => {
        const checked = layup.id === config.layup;
        const noteId = `layup-note-${i}`;
        return (
          <div key={layup.id} className={`layup ${checked ? 'is-selected' : ''} ${reason ? 'is-disabled' : ''}`}>
            <button {...radio(i)} className="layup-button" aria-describedby={reason ? noteId : undefined}>
              <span className="radio-dot">{checked && <Check size={12} strokeWidth={3} />}</span>
              <span className="layup-name">
                <strong>{layup.id}</strong>
                <small>{layup.tag}</small>
              </span>
              <span className="layup-price">{priceLabel(layup.price)}</span>
            </button>
            {reason && (
              <p className="layup-reason" id={noteId}>
                {reason}
              </p>
            )}
          </div>
        );
      })}
    </div>
    <details className="choice-details" key={selected.id}>
      <summary>About {selected.id} construction</summary>
      <p>{selected.description} {selected.tradeoff}</p>
      <dl className="spec-grid">{[['Core', selected.core], ['Base', selected.base], ['Edges', selected.edge], ['Weight', selected.weight]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </details></>
  );
}

function SwitchRow({title, description, reason, price, checked, disabled, onChange}) {
  return (
    <label className={`switch-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="switch-copy">
        <strong>{title}</strong>
        <small>{reason || description}</small>
      </span>
      <span className="switch-price">{price}</span>
      <input type="checkbox" role="switch" className="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export default function ConstructionPanel({config, update, openModal, onView}) {
  const rules = rulesFor(config);
  const flexLock = optionReason(config, 'flex', 'Soft');
  return (
    <div className="construction-panel">
      <PanelHead index={2} title="Construction">
        Choose what’s inside, and see exactly what changes.
      </PanelHead>

      <Field
        label="Layup"
        action={
          <button type="button" className="text-button" onClick={() => openModal('layups')}>
            Compare layups
          </button>
        }
      >
        <LayupList config={config} update={update} onView={onView} />
      </Field>

      <Field label="Flex" action={<span className="field-note">{priceLabel(flexPrice(config.flex))}</span>}>
        <RadioGroup
          label="Flex"
          className="segmented block"
          options={flexOptions.map(f => ({value: f.id, label: f.id, disabled: !!optionReason(config, 'flex', f.id), describedBy: 'flex-note'}))}
          value={config.flex}
          onChange={flex => update({flex})}
        />
        <p id="flex-note" className="hint">
          {flexLock || flexOptions.find(f => f.id === config.flex).hint}
        </p>
      </Field>

      <details className="finishing-details"><summary><strong>Finishing</strong><span>{config.detune ? 'Park detune' : 'All mountain'} · {config.skinClip ? 'Skin clip' : 'Stock tail'}</span></summary><Field label="Finishing options">
        <SwitchRow
          title="Park detune"
          description="Rounded edges underfoot for rails. Less grip on hard snow."
          reason={optionReason(config, 'detune')}
          price={`+${money(PRICES.detune)}`}
          checked={config.detune}
          disabled={!!optionReason(config, 'detune')}
          onChange={detune => update({detune})}
        />
        <SwitchRow
          title="Skin clip notch"
          description="Keeps a climbing-skin tail clip centered. May catch skiing switch in deep snow."
          reason={optionReason(config, 'skinClip')}
          price={rules.skinClip === 'included' ? 'Included' : `+${money(PRICES.skinClip)}`}
          checked={config.skinClip}
          disabled={!!optionReason(config, 'skinClip')}
          onChange={skinClip => update({skinClip})}
        />
      </Field></details>
      <p className="fine">Reference prices. Metal layups are shown at their regular $150 upgrade price. Options follow ON3P’s published builder rules; availability can change.</p>
    </div>
  );
}
